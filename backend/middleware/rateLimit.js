// Middleware de protection contre le brute force
// Limite le nombre de tentatives de connexion par IP
// Utilise Sequelize pour persister les données en base

import BlockedIp from '../models/BlockedIp.mjs';
import { Op } from 'sequelize';

// Configuration
const MAX_ATTEMPTS = 5; // Nombre maximum de tentatives
const WINDOW_MS = 1 * 60 * 1000; // 1 minute en millisecondes
const COOLDOWN_MS = 5 * 1000; // Délai minimum entre deux tentatives (5s)

/**
 * Nettoie les tentatives expirées (appelé périodiquement)
 */
async function cleanExpiredAttempts() {
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - WINDOW_MS);

    // Réinitialiser les entrées non bloquées dont la fenêtre est expirée
    await BlockedIp.update({
      attempts: 0,
      firstAttempt: now,
      lastAttempt: now,
      blocked: false,
      blockedUntil: null
    }, {
      where: {
        blocked: false,
        firstAttempt: {
          [Op.lt]: windowStart
        }
      }
    });

    // Les IP bloquées restent bloquées indéfiniment
  } catch (error) {
    console.error('Erreur lors du nettoyage des tentatives expirées:', error);
    // Ne pas bloquer si le nettoyage échoue
  }
}

/**
 * Obtient l'adresse IP du client
 * Gère les cas avec reverse proxy, load balancer, Docker, etc.
 */
function getClientIP(req) {
  // Avec trust proxy activé, req.ip devrait déjà contenir la bonne IP
  // Mais on vérifie quand même les headers au cas où
  
  // X-Forwarded-For peut contenir plusieurs IPs séparées par des virgules
  // La première est généralement l'IP du client réel
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',').map(ip => ip.trim());
    // Ignorer les IPs privées Docker (172.x.x.x, 10.x.x.x, 192.168.x.x)
    for (const ip of ips) {
      if (!ip.startsWith('172.') && !ip.startsWith('10.') && !ip.startsWith('192.168.')) {
        return ip;
      }
    }
    // Si toutes sont privées, prendre la première
    if (ips.length > 0) {
      return ips[0];
    }
  }
  
  // X-Real-IP (nginx)
  const xRealIp = req.headers['x-real-ip'];
  if (xRealIp && !xRealIp.startsWith('172.') && !xRealIp.startsWith('10.') && !xRealIp.startsWith('192.168.')) {
    return xRealIp.trim();
  }
  
  // req.ip (fonctionne si trust proxy est activé)
  if (req.ip && req.ip !== '::ffff:127.0.0.1' && !req.ip.startsWith('172.') && !req.ip.startsWith('10.') && !req.ip.startsWith('192.168.')) {
    return req.ip;
  }
  
  // Fallback sur connection.remoteAddress
  const remoteAddress = req.connection?.remoteAddress || req.socket?.remoteAddress;
  if (remoteAddress && !remoteAddress.startsWith('172.') && !remoteAddress.startsWith('10.') && !remoteAddress.startsWith('192.168.')) {
    return remoteAddress;
  }
  
  // Si on n'a que des IPs privées, prendre la dernière de X-Forwarded-For (généralement le client)
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',').map(ip => ip.trim());
    return ips[ips.length - 1];
  }
  
  // Dernier recours
  return req.ip || remoteAddress || 'unknown';
}

/**
 * Middleware de rate limiting pour le login
 */
export const loginRateLimit = async (req, res, next) => {
  try {
    // Nettoyer périodiquement (une fois sur 10 requêtes environ pour éviter trop de requêtes DB)
    if (Math.random() < 0.1) {
      await cleanExpiredAttempts();
    }

    const clientIP = getClientIP(req);
    const now = new Date();

    // Chercher ou créer l'entrée
    let [blockedIp] = await BlockedIp.findOrCreate({
      where: { ip: clientIP },
      defaults: {
        ip: clientIP,
        attempts: 0,
        firstAttempt: now,
        lastAttempt: now,
        blocked: false,
        blockedUntil: null
      }
    });

    // Si l'IP est bloquée
    if (blockedIp?.blocked) {
      return res.status(429).json({
        error: 'Trop de tentatives de connexion. Cette adresse IP est désormais bloquée définitivement.',
        retryAfter: null,
        blocked: true
      });
    }

    if (now - new Date(blockedIp.firstAttempt) > WINDOW_MS && !blockedIp.blocked) {
      // Réinitialiser si la fenêtre est expirée
      await BlockedIp.update({
        attempts: 0,
        firstAttempt: now,
        lastAttempt: now,
        blocked: false,
        blockedUntil: null
      }, { where: { ip: clientIP } });
      blockedIp = await BlockedIp.findOne({ where: { ip: clientIP } });
    }

    // Délai minimum entre deux tentatives pour éviter le spam rapide
    if (blockedIp.attempts > 0 && blockedIp.lastAttempt) {
      const sinceLastAttempt = now - new Date(blockedIp.lastAttempt);
      if (sinceLastAttempt < COOLDOWN_MS) {
        const retryAfterMs = COOLDOWN_MS - sinceLastAttempt;
        return res.status(429).json({
          error: 'Veuillez patienter quelques secondes avant une nouvelle tentative.',
          retryAfterMs,
          retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
          blocked: false,
          cooldown: true
        });
      }
    }

    // Vérifier si on a atteint le maximum (avant d'incrémenter)
    if (blockedIp.attempts >= MAX_ATTEMPTS) {
      await BlockedIp.update(
        {
          blocked: true,
          blockedUntil: null
        },
        { where: { ip: clientIP } }
      );

      return res.status(429).json({
        error: 'Trop de tentatives de connexion. Cette adresse IP est désormais bloquée définitivement.',
        retryAfter: null,
        attemptsInfo: {
          attempts: MAX_ATTEMPTS,
          remaining: 0,
          blocked: true,
          blockedUntil: null,
          permanent: true
        }
      });
    }

    // Stocker les infos dans req pour utilisation dans la route (sans incrémenter encore)
    req.loginAttemptsData = {
      count: blockedIp.attempts,
      firstAttempt: blockedIp.firstAttempt,
      lastAttempt: blockedIp.lastAttempt,
      blocked: blockedIp.blocked,
      blockedUntil: blockedIp.blockedUntil
    };
    req.clientIP = clientIP;

    next();
  } catch (error) {
    console.error('Erreur dans loginRateLimit:', error);
    // En cas d'erreur DB, laisser passer pour ne pas bloquer l'application
    next();
  }
};

/**
 * Réinitialise les tentatives pour une IP (appelé après connexion réussie)
 */
export const resetLoginAttempts = async (req) => {
  try {
    const clientIP = req.clientIP || getClientIP(req);
    const now = new Date();
    // Utiliser upsert pour éviter les erreurs de clé unique en cas de course
    await BlockedIp.upsert({
      ip: clientIP,
      attempts: 0,
      blocked: false,
      blockedUntil: null,
      firstAttempt: now,
      lastAttempt: now,
      updatedAt: now,
      createdAt: now
    });
  } catch (error) {
    console.error('Erreur lors de la réinitialisation des tentatives:', error);
  }
};

/**
 * Incrémente le compteur de tentatives après un échec d'authentification
 */
export const incrementLoginAttempts = async (req) => {
  try {
    const clientIP = req.clientIP || getClientIP(req);
    const now = new Date();
    
    let [blockedIp] = await BlockedIp.findOrCreate({
      where: { ip: clientIP },
      defaults: {
        ip: clientIP,
        attempts: 0,
        firstAttempt: now,
        lastAttempt: now,
        blocked: false,
        blockedUntil: null
      }
    });

    // Si la fenêtre est expirée et non bloquée, réinitialiser
    if (now - new Date(blockedIp.firstAttempt) > WINDOW_MS && !blockedIp.blocked) {
      await BlockedIp.update({
        attempts: 0,
        firstAttempt: now,
        lastAttempt: now,
        blocked: false,
        blockedUntil: null
      }, { where: { ip: clientIP } });
      blockedIp.attempts = 0;
    }

    // Incrémenter le compteur (utiliser la valeur actuelle depuis la DB)
    const currentAttempts = blockedIp.attempts || 0;
    const newAttempts = currentAttempts + 1;
    const updateData = {
      attempts: newAttempts,
      lastAttempt: now,
      blockedUntil: null
    };

    // Si on a atteint le maximum de tentatives
    if (newAttempts >= MAX_ATTEMPTS) {
      updateData.blocked = true;
      updateData.blockedUntil = null;
    }

    await BlockedIp.update(updateData, { where: { ip: clientIP } });

    // Recharger l'entrée pour avoir les valeurs à jour
    const updatedBlockedIp = await BlockedIp.findOne({ where: { ip: clientIP } });

    return {
      count: updatedBlockedIp.attempts,
      firstAttempt: updatedBlockedIp.firstAttempt,
      lastAttempt: updatedBlockedIp.lastAttempt,
      blocked: updatedBlockedIp.blocked,
      blockedUntil: updatedBlockedIp.blockedUntil
    };
  } catch (error) {
    console.error('Erreur lors de l\'incrémentation des tentatives:', error);
    return null;
  }
};

/**
 * Récupère les informations de tentatives pour une IP
 */
export const getLoginAttemptsInfo = async (req) => {
  try {
    const clientIP = req.clientIP || getClientIP(req);
    const now = new Date();
    
    const blockedIp = await BlockedIp.findOne({ where: { ip: clientIP } });

    if (!blockedIp) {
      return {
        attempts: 0,
        remaining: MAX_ATTEMPTS,
        blocked: false,
        blockedUntil: null
      };
    }

    // Si la fenêtre est expirée
    if (now - new Date(blockedIp.firstAttempt) > WINDOW_MS && !blockedIp.blocked) {
      await BlockedIp.update({
        attempts: 0,
        firstAttempt: now,
        lastAttempt: now,
        blocked: false,
        blockedUntil: null
      }, { where: { ip: clientIP } });

      return {
        attempts: 0,
        remaining: MAX_ATTEMPTS,
        blocked: false,
        blockedUntil: null
      };
    }

    // Si bloqué
    if (blockedIp.blocked) {
      return {
        attempts: MAX_ATTEMPTS,
        remaining: 0,
        blocked: true,
        blockedUntil: null,
        permanent: true
      };
    }

    return {
      attempts: blockedIp.attempts,
      remaining: MAX_ATTEMPTS - blockedIp.attempts,
      blocked: false,
      blockedUntil: null
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des infos de tentatives:', error);
    // Retourner des valeurs par défaut en cas d'erreur
    return {
      attempts: 0,
      remaining: MAX_ATTEMPTS,
      blocked: false,
      blockedUntil: null
    };
  }
};


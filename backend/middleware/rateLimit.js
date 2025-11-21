// Middleware de protection contre le brute force
// Limite le nombre de tentatives de connexion par IP
// Utilise Sequelize pour persister les données en base

import BlockedIp from '../models/BlockedIp.mjs';
import { Op } from 'sequelize';

// Configuration
const MAX_ATTEMPTS = 5; // Nombre maximum de tentatives
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes en millisecondes
const BLOCK_DURATION_MS = 15 * 60 * 1000; // Blocage de 15 minutes après dépassement

/**
 * Nettoie les tentatives expirées (appelé périodiquement)
 */
async function cleanExpiredAttempts() {
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - WINDOW_MS);

    // Supprimer les entrées non bloquées dont la fenêtre est expirée
    await BlockedIp.destroy({
      where: {
        blocked: false,
        firstAttempt: {
          [Op.lt]: windowStart
        }
      }
    });

    // Supprimer les entrées bloquées dont le blocage est expiré
    await BlockedIp.destroy({
      where: {
        blocked: true,
        blockedUntil: {
          [Op.lt]: now
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors du nettoyage des tentatives expirées:', error);
    // Ne pas bloquer si le nettoyage échoue
  }
}

/**
 * Obtient l'adresse IP du client
 */
function getClientIP(req) {
  return (
    req.ip ||
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    'unknown'
  );
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

    // Chercher l'entrée existante
    let blockedIp = await BlockedIp.findOne({ where: { ip: clientIP } });

    // Si l'IP est bloquée
    if (blockedIp?.blocked) {
      if (blockedIp.blockedUntil && now < new Date(blockedIp.blockedUntil)) {
        const remainingMinutes = Math.ceil((new Date(blockedIp.blockedUntil) - now) / 60000);
        return res.status(429).json({
          error: `Trop de tentatives de connexion. Veuillez réessayer dans ${remainingMinutes} minute(s).`,
          retryAfter: Math.ceil((new Date(blockedIp.blockedUntil) - now) / 1000)
        });
      } else {
        // Débloquer si la période est expirée
        await BlockedIp.destroy({ where: { ip: clientIP } });
        blockedIp = null;
      }
    }

    // Si c'est la première tentative ou si la fenêtre est expirée
    if (!blockedIp || (now - new Date(blockedIp.firstAttempt) > WINDOW_MS && !blockedIp.blocked)) {
      // Créer ou réinitialiser l'entrée
      if (blockedIp) {
        await BlockedIp.destroy({ where: { ip: clientIP } });
      }
      
      const newBlockedIp = await BlockedIp.create({
        ip: clientIP,
        attempts: 0,
        firstAttempt: now,
        lastAttempt: now,
        blocked: false,
        blockedUntil: null
      });

      req.loginAttemptsData = {
        count: newBlockedIp.attempts,
        firstAttempt: newBlockedIp.firstAttempt,
        lastAttempt: newBlockedIp.lastAttempt,
        blocked: newBlockedIp.blocked,
        blockedUntil: newBlockedIp.blockedUntil
      };
      req.clientIP = clientIP;
      return next();
    }

    // Vérifier si on a atteint le maximum (avant d'incrémenter)
    if (blockedIp.attempts >= MAX_ATTEMPTS) {
      const blockedUntil = new Date(now.getTime() + BLOCK_DURATION_MS);
      await BlockedIp.update(
        {
          blocked: true,
          blockedUntil: blockedUntil
        },
        { where: { ip: clientIP } }
      );

      return res.status(429).json({
        error: `Trop de tentatives de connexion. Compte bloqué pendant ${BLOCK_DURATION_MS / 60000} minutes.`,
        retryAfter: BLOCK_DURATION_MS / 1000,
        attemptsInfo: {
          attempts: MAX_ATTEMPTS,
          remaining: 0,
          blocked: true,
          blockedUntil: blockedUntil,
          remainingMinutes: Math.ceil(BLOCK_DURATION_MS / 60000)
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
    await BlockedIp.destroy({ where: { ip: clientIP } });
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
    
    let blockedIp = await BlockedIp.findOne({ where: { ip: clientIP } });

    // Si l'entrée n'existe pas, la créer avec attempts: 0
    if (!blockedIp) {
      blockedIp = await BlockedIp.create({
        ip: clientIP,
        attempts: 0,
        firstAttempt: now,
        lastAttempt: now,
        blocked: false,
        blockedUntil: null
      });
    } else {
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
    }

    // Incrémenter le compteur (utiliser la valeur actuelle depuis la DB)
    const currentAttempts = blockedIp.attempts || 0;
    const newAttempts = currentAttempts + 1;
    const updateData = {
      attempts: newAttempts,
      lastAttempt: now
    };

    // Si on a atteint le maximum de tentatives
    if (newAttempts >= MAX_ATTEMPTS) {
      const blockedUntil = new Date(now.getTime() + BLOCK_DURATION_MS);
      updateData.blocked = true;
      updateData.blockedUntil = blockedUntil;
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
      return {
        attempts: 0,
        remaining: MAX_ATTEMPTS,
        blocked: false,
        blockedUntil: null
      };
    }

    // Si bloqué
    if (blockedIp.blocked && blockedIp.blockedUntil) {
      if (now < new Date(blockedIp.blockedUntil)) {
        return {
          attempts: MAX_ATTEMPTS,
          remaining: 0,
          blocked: true,
          blockedUntil: blockedIp.blockedUntil,
          remainingMinutes: Math.ceil((new Date(blockedIp.blockedUntil) - now) / 60000)
        };
      } else {
        // Débloquer
        await BlockedIp.destroy({ where: { ip: clientIP } });
        return {
          attempts: 0,
          remaining: MAX_ATTEMPTS,
          blocked: false,
          blockedUntil: null
        };
      }
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

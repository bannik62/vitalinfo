// Middleware de protection contre le brute force
// Limite le nombre de tentatives de connexion par IP

const loginAttempts = new Map();

// Configuration
const MAX_ATTEMPTS = 5; // Nombre maximum de tentatives
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes en millisecondes
const BLOCK_DURATION_MS = 15 * 60 * 1000; // Blocage de 15 minutes après dépassement

/**
 * Nettoie les tentatives expirées
 */
function cleanExpiredAttempts() {
  const now = Date.now();
  for (const [ip, data] of loginAttempts.entries()) {
    if (now - data.firstAttempt > WINDOW_MS && !data.blocked) {
      loginAttempts.delete(ip);
    } else if (data.blocked && now - data.blockedUntil > 0) {
      // Débloquer après la période de blocage
      loginAttempts.delete(ip);
    }
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
export const loginRateLimit = (req, res, next) => {
  cleanExpiredAttempts();

  const clientIP = getClientIP(req);
  const now = Date.now();

  const attemptData = loginAttempts.get(clientIP);

  // Si l'IP est bloquée
  if (attemptData?.blocked) {
    if (now < attemptData.blockedUntil) {
      const remainingMinutes = Math.ceil((attemptData.blockedUntil - now) / 60000);
      return res.status(429).json({
        error: `Trop de tentatives de connexion. Veuillez réessayer dans ${remainingMinutes} minute(s).`,
        retryAfter: Math.ceil((attemptData.blockedUntil - now) / 1000)
      });
    } else {
      // Débloquer
      loginAttempts.delete(clientIP);
    }
  }

  // Si c'est la première tentative ou si la fenêtre est expirée
  if (!attemptData || now - attemptData.firstAttempt > WINDOW_MS) {
    // Initialiser sans incrémenter (sera incrémenté seulement en cas d'échec)
    const newAttemptData = {
      count: 0,
      firstAttempt: now,
      lastAttempt: now,
      blocked: false
    };
    loginAttempts.set(clientIP, newAttemptData);
    req.loginAttemptsData = newAttemptData;
    req.clientIP = clientIP;
    return next();
  }

  // Vérifier si on a atteint le maximum (avant d'incrémenter)
  if (attemptData.count >= MAX_ATTEMPTS) {
    const blockedUntil = now + BLOCK_DURATION_MS;
    attemptData.blocked = true;
    attemptData.blockedUntil = blockedUntil;
    loginAttempts.set(clientIP, attemptData);

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
  req.loginAttemptsData = attemptData;
  req.clientIP = clientIP;

  next();
};

/**
 * Réinitialise les tentatives pour une IP (appelé après connexion réussie)
 */
export const resetLoginAttempts = (req) => {
  const clientIP = getClientIP(req);
  loginAttempts.delete(clientIP);
};

/**
 * Incrémente le compteur de tentatives après un échec d'authentification
 */
export const incrementLoginAttempts = (req) => {
  cleanExpiredAttempts();
  
  const clientIP = req.clientIP || getClientIP(req);
  const now = Date.now();
  let attemptData = loginAttempts.get(clientIP);

  // Si c'est la première tentative ou si la fenêtre est expirée
  if (!attemptData || now - attemptData.firstAttempt > WINDOW_MS) {
    attemptData = {
      count: 0,
      firstAttempt: now,
      lastAttempt: now,
      blocked: false
    };
  }

  // Incrémenter le compteur
  attemptData.count++;
  attemptData.lastAttempt = now;

  // Si on a atteint le maximum de tentatives
  if (attemptData.count >= MAX_ATTEMPTS) {
    const blockedUntil = now + BLOCK_DURATION_MS;
    attemptData.blocked = true;
    attemptData.blockedUntil = blockedUntil;
  }

  loginAttempts.set(clientIP, attemptData);
  return attemptData;
};

/**
 * Récupère les informations de tentatives pour une IP
 */
export const getLoginAttemptsInfo = (req) => {
  cleanExpiredAttempts();
  
  const clientIP = req.clientIP || getClientIP(req);
  const now = Date.now();
  const attemptData = loginAttempts.get(clientIP);

  if (!attemptData) {
    return {
      attempts: 0,
      remaining: MAX_ATTEMPTS,
      blocked: false,
      blockedUntil: null
    };
  }

  // Si la fenêtre est expirée
  if (now - attemptData.firstAttempt > WINDOW_MS && !attemptData.blocked) {
    return {
      attempts: 0,
      remaining: MAX_ATTEMPTS,
      blocked: false,
      blockedUntil: null
    };
  }

  // Si bloqué
  if (attemptData.blocked) {
    if (now < attemptData.blockedUntil) {
      return {
        attempts: MAX_ATTEMPTS,
        remaining: 0,
        blocked: true,
        blockedUntil: attemptData.blockedUntil,
        remainingMinutes: Math.ceil((attemptData.blockedUntil - now) / 60000)
      };
    } else {
      // Débloquer
      loginAttempts.delete(clientIP);
      return {
        attempts: 0,
        remaining: MAX_ATTEMPTS,
        blocked: false,
        blockedUntil: null
      };
    }
  }

  return {
    attempts: attemptData.count,
    remaining: MAX_ATTEMPTS - attemptData.count,
    blocked: false,
    blockedUntil: null
  };
};


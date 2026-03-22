import SecurityLog from '../models/SecurityLog.mjs';

/**
 * Obtient l'IP réelle du client (même derrière un proxy)
 */
export function getClientIP(req) {
  return (
    req.ip ||
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    'unknown'
  );
}

/**
 * Enregistre un événement de sécurité
 */
export async function logSecurityEvent(event) {
  try {
    await SecurityLog.create({
      type: event.type,
      severity: event.severity || 'INFO',
      ip: event.ip,
      email: event.email || null,
      reason: event.reason || null,
      userAgent: event.userAgent || null,
      path: event.path || null,
      origin: event.origin || null,
      metadata: event.metadata || null
    });

    // Log également dans la console pour le debugging
    const emoji = {
      INFO: 'ℹ️',
      WARNING: '⚠️',
      HIGH: '🚨',
      CRITICAL: '🔥'
    }[event.severity] || 'ℹ️';

    console.log(`${emoji} [${event.severity}] ${event.type} - IP: ${event.ip}${event.email ? ` - Email: ${event.email}` : ''}`);
  } catch (error) {
    // Ne jamais crasher l'application à cause du logging
    console.error('❌ Erreur lors du logging de sécurité:', error.message);
  }
}



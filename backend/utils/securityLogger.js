import SecurityLog from '../models/SecurityLog.mjs';

/**
 * Obtient l'IP réelle du client (même derrière un proxy)
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
 * Enregistre un événement de sécurité
 * 
 * @param {Object} event - Événement à logger
 * @param {string} event.type - Type d'événement (LOGIN_FAILED, CSRF_ATTACK, etc.)
 * @param {string} event.severity - Sévérité (INFO, WARNING, HIGH, CRITICAL)
 * @param {string} event.ip - Adresse IP
 * @param {string} [event.email] - Email concerné
 * @param {string} [event.reason] - Raison de l'événement
 * @param {string} [event.userAgent] - User-Agent
 * @param {string} [event.path] - Chemin de la requête
 * @param {string} [event.origin] - Origin header
 * @param {Object} [event.metadata] - Données additionnelles
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

/**
 * Récupère les statistiques de sécurité des dernières 24h
 */
export async function getSecurityStats() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const stats = await SecurityLog.findAll({
      where: {
        createdAt: { [Op.gte]: oneDayAgo }
      },
      attributes: [
        'type',
        'severity',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['type', 'severity'],
      order: [[sequelize.literal('count'), 'DESC']]
    });

    return stats;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des stats:', error.message);
    return [];
  }
}

/**
 * Récupère les IPs les plus suspectes
 */
export async function getTopSuspiciousIPs(limit = 10) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  try {
    const ips = await SecurityLog.findAll({
      where: {
        createdAt: { [Op.gte]: oneHourAgo },
        type: ['LOGIN_FAILED', 'CSRF_ATTACK', 'RATE_LIMIT_BLOCKED']
      },
      attributes: [
        'ip',
        [sequelize.fn('COUNT', sequelize.col('id')), 'attempts'],
        [sequelize.fn('MAX', sequelize.col('createdAt')), 'lastAttempt']
      ],
      group: ['ip'],
      order: [[sequelize.literal('attempts'), 'DESC']],
      limit
    });

    return ips;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des IPs suspectes:', error.message);
    return [];
  }
}

/**
 * Nettoie les logs de sécurité anciens (plus de 30 jours)
 * À appeler régulièrement (cron job)
 */
export async function cleanOldSecurityLogs() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  try {
    const deleted = await SecurityLog.destroy({
      where: {
        createdAt: { [Op.lt]: thirtyDaysAgo },
        severity: ['INFO', 'WARNING'] // Garder HIGH et CRITICAL plus longtemps
      }
    });

    console.log(`🧹 Nettoyage : ${deleted} logs de sécurité supprimés`);
    return deleted;
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage des logs:', error.message);
    return 0;
  }
}

export { getClientIP };


import express from 'express';
import { Op } from 'sequelize';
import SecurityLog from '../models/SecurityLog.mjs';
import { authenticateToken } from '../middleware/auth.js';
import csrfProtection from '../middleware/csrf.js';
import sequelize from '../config/database.js';

const router = express.Router();

// Middleware pour vérifier que l'utilisateur est admin
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  }
  next();
};

/**
 * GET /api/security/stats
 * Récupère les statistiques de sécurité
 */
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { period = '24h' } = req.query;

    // Calculer la date de début selon la période
    let startDate;
    switch (period) {
      case '1h':
        startDate = new Date(Date.now() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    }

    // Statistiques par type
    const statsByType = await SecurityLog.findAll({
      where: {
        createdAt: { [Op.gte]: startDate }
      },
      attributes: [
        'type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['type'],
      order: [[sequelize.literal('count'), 'DESC']]
    });

    // Statistiques par sévérité
    const statsBySeverity = await SecurityLog.findAll({
      where: {
        createdAt: { [Op.gte]: startDate }
      },
      attributes: [
        'severity',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['severity']
    });

    // Top IPs suspectes
    const topIPs = await SecurityLog.findAll({
      where: {
        createdAt: { [Op.gte]: startDate },
        type: { [Op.in]: ['LOGIN_FAILED', 'CSRF_ATTACK', 'RATE_LIMIT_BLOCKED'] }
      },
      attributes: [
        'ip',
        [sequelize.fn('COUNT', sequelize.col('id')), 'attempts'],
        [sequelize.fn('MAX', sequelize.col('createdAt')), 'lastAttempt']
      ],
      group: ['ip'],
      order: [[sequelize.literal('attempts'), 'DESC']],
      limit: 10
    });

    // Top emails ciblés
    const topEmails = await SecurityLog.findAll({
      where: {
        createdAt: { [Op.gte]: startDate },
        email: { [Op.ne]: null },
        type: 'LOGIN_FAILED'
      },
      attributes: [
        'email',
        [sequelize.fn('COUNT', sequelize.col('id')), 'attempts']
      ],
      group: ['email'],
      order: [[sequelize.literal('attempts'), 'DESC']],
      limit: 10
    });

    res.json({
      period,
      startDate,
      statsByType: statsByType.map(s => ({
        type: s.type,
        count: parseInt(s.get('count'))
      })),
      statsBySeverity: statsBySeverity.map(s => ({
        severity: s.severity,
        count: parseInt(s.get('count'))
      })),
      topIPs: topIPs.map(ip => ({
        ip: ip.ip,
        attempts: parseInt(ip.get('attempts')),
        lastAttempt: ip.get('lastAttempt')
      })),
      topEmails: topEmails.map(email => ({
        email: email.email,
        attempts: parseInt(email.get('attempts'))
      }))
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des stats:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/security/logs
 * Récupère les logs de sécurité récents
 */
router.get('/logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { 
      limit = 50, 
      offset = 0, 
      type = null, 
      severity = null,
      ip = null
    } = req.query;

    const where = {};
    if (type) where.type = type;
    if (severity) where.severity = severity;
    if (ip) where.ip = ip;

    const logs = await SecurityLog.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      total: logs.count,
      logs: logs.rows
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des logs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;



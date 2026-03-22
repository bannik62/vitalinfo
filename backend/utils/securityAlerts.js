import nodemailer from 'nodemailer';
import SecurityLog from '../models/SecurityLog.mjs';
import { Op } from 'sequelize';

// Configuration email
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Vérifie s'il y a des attaques en cours et envoie une alerte
 * À appeler toutes les 5 minutes (cron job)
 */
export async function checkAndAlertAttacks() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  try {
    // Compter les tentatives de login échouées
    const failedLogins = await SecurityLog.count({
      where: {
        type: 'LOGIN_FAILED',
        createdAt: { [Op.gte]: fiveMinutesAgo }
      }
    });

    // Compter les attaques CSRF
    const csrfAttacks = await SecurityLog.count({
      where: {
        type: 'CSRF_ATTACK',
        createdAt: { [Op.gte]: fiveMinutesAgo }
      }
    });

    // Compter les IPs bloquées
    const blockedIPs = await SecurityLog.count({
      where: {
        type: 'RATE_LIMIT_BLOCKED',
        createdAt: { [Op.gte]: fiveMinutesAgo }
      },
      distinct: true,
      col: 'ip'
    });

    // Seuils d'alerte
    const THRESHOLDS = {
      failedLogins: 20,
      csrfAttacks: 5,
      blockedIPs: 3
    };

    let alertNeeded = false;
    let alertMessage = '🚨 ALERTE SÉCURITÉ - VitalInfo\n\n';

    if (failedLogins > THRESHOLDS.failedLogins) {
      alertNeeded = true;
      alertMessage += `⚠️ ${failedLogins} tentatives de connexion échouées (5 dernières minutes)\n`;
    }

    if (csrfAttacks > THRESHOLDS.csrfAttacks) {
      alertNeeded = true;
      alertMessage += `🔥 ${csrfAttacks} attaques CSRF détectées (5 dernières minutes)\n`;
    }

    if (blockedIPs > THRESHOLDS.blockedIPs) {
      alertNeeded = true;
      alertMessage += `🚫 ${blockedIPs} IPs bloquées par rate limiting\n`;
    }

    if (alertNeeded) {
      // Récupérer les IPs suspectes
      const topIPs = await SecurityLog.findAll({
        where: {
          createdAt: { [Op.gte]: fiveMinutesAgo }
        },
        attributes: [
          'ip',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['ip'],
        order: [[sequelize.literal('count'), 'DESC']],
        limit: 5
      });

      alertMessage += '\n📊 Top IPs suspectes :\n';
      topIPs.forEach((record, index) => {
        alertMessage += `${index + 1}. ${record.ip} : ${record.get('count')} tentatives\n`;
      });

      alertMessage += '\n🔗 Vérifiez le dashboard : https://vitalinfo.site/admin/security\n';
      alertMessage += `⏰ ${new Date().toLocaleString('fr-FR')}\n`;

      // Envoyer l'alerte
      await sendSecurityAlert(alertMessage);
    }

  } catch (error) {
    console.error('❌ Erreur lors de la vérification des attaques:', error.message);
  }
}

/**
 * Envoie une alerte de sécurité par email
 */
async function sendSecurityAlert(message) {
  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || 'security@vitalinfo.site',
      to: process.env.SECURITY_ALERT_EMAIL || 'admin@vitalinfo.site',
      subject: '🚨 ALERTE SÉCURITÉ - Activité suspecte détectée',
      text: message,
      html: message.replace(/\n/g, '<br>')
    };

    await transporter.sendMail(mailOptions);
    console.log('📧 Alerte de sécurité envoyée par email');
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'alerte:', error.message);
    // Fallback : log dans la console
    console.error('🚨 ALERTE NON ENVOYÉE :', message);
  }
}

/**
 * Génère un rapport de sécurité quotidien
 * À appeler tous les jours à minuit (cron job)
 */
export async function generateDailySecurityReport() {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const stats = {
      loginSuccess: await SecurityLog.count({
        where: { type: 'LOGIN_SUCCESS', createdAt: { [Op.gte]: yesterday } }
      }),
      loginFailed: await SecurityLog.count({
        where: { type: 'LOGIN_FAILED', createdAt: { [Op.gte]: yesterday } }
      }),
      csrfAttacks: await SecurityLog.count({
        where: { type: 'CSRF_ATTACK', createdAt: { [Op.gte]: yesterday } }
      }),
      rateLimitBlocked: await SecurityLog.count({
        where: { type: 'RATE_LIMIT_BLOCKED', createdAt: { [Op.gte]: yesterday } }
      })
    };

    const report = `
📊 RAPPORT DE SÉCURITÉ QUOTIDIEN - VitalInfo
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 Date : ${new Date().toLocaleDateString('fr-FR')}

✅ Connexions réussies : ${stats.loginSuccess}
❌ Tentatives échouées : ${stats.loginFailed}
🚨 Attaques CSRF : ${stats.csrfAttacks}
🚫 IPs bloquées : ${stats.rateLimitBlocked}

📈 Taux de réussite : ${(stats.loginSuccess / (stats.loginSuccess + stats.loginFailed) * 100).toFixed(1)}%

${stats.loginFailed > 50 ? '⚠️ ATTENTION : Nombre élevé de tentatives échouées !' : '✅ Activité normale'}
${stats.csrfAttacks > 0 ? '🔥 ALERTE : Attaques CSRF détectées !' : '✅ Aucune attaque CSRF'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    const mailOptions = {
      from: process.env.SMTP_FROM || 'security@vitalinfo.site',
      to: process.env.SECURITY_REPORT_EMAIL || 'admin@vitalinfo.site',
      subject: `📊 Rapport de sécurité quotidien - ${new Date().toLocaleDateString('fr-FR')}`,
      text: report,
      html: report.replace(/\n/g, '<br>')
    };

    await transporter.sendMail(mailOptions);
    console.log('📧 Rapport de sécurité quotidien envoyé');

  } catch (error) {
    console.error('❌ Erreur lors de la génération du rapport:', error.message);
  }
}



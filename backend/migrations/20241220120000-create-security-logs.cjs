'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('security_logs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'LOGIN_FAILED, CSRF_ATTACK, RATE_LIMIT_BLOCKED, etc.'
      },
      severity: {
        type: Sequelize.ENUM('INFO', 'WARNING', 'HIGH', 'CRITICAL'),
        defaultValue: 'INFO',
        allowNull: false
      },
      ip: {
        type: Sequelize.STRING(45),
        allowNull: false,
        comment: 'IPv4 ou IPv6'
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Email tenté (si applicable)'
      },
      reason: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'USER_NOT_FOUND, INVALID_PASSWORD, etc.'
      },
      userAgent: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      path: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Route appelée'
      },
      origin: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Origin header (pour CSRF)'
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Données additionnelles'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Créer les index pour optimiser les requêtes
    await queryInterface.addIndex('security_logs', ['type'], {
      name: 'idx_security_logs_type'
    });

    await queryInterface.addIndex('security_logs', ['severity'], {
      name: 'idx_security_logs_severity'
    });

    await queryInterface.addIndex('security_logs', ['ip'], {
      name: 'idx_security_logs_ip'
    });

    await queryInterface.addIndex('security_logs', ['email'], {
      name: 'idx_security_logs_email'
    });

    await queryInterface.addIndex('security_logs', ['createdAt'], {
      name: 'idx_security_logs_created_at'
    });
  },

  async down(queryInterface, Sequelize) {
    // Supprimer les index
    await queryInterface.removeIndex('security_logs', 'idx_security_logs_type');
    await queryInterface.removeIndex('security_logs', 'idx_security_logs_severity');
    await queryInterface.removeIndex('security_logs', 'idx_security_logs_ip');
    await queryInterface.removeIndex('security_logs', 'idx_security_logs_email');
    await queryInterface.removeIndex('security_logs', 'idx_security_logs_created_at');
    
    // Supprimer la table
    await queryInterface.dropTable('security_logs');
  }
};


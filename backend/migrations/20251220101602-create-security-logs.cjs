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
        allowNull: false
      },
      severity: {
        type: Sequelize.ENUM('INFO', 'WARNING', 'HIGH', 'CRITICAL'),
        defaultValue: 'INFO',
        allowNull: false
      },
      ip: {
        type: Sequelize.STRING(45),
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      reason: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      userAgent: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      path: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      origin: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true
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

    // Ajout des index pour optimiser les requêtes
    await queryInterface.addIndex('security_logs', ['type']);
    await queryInterface.addIndex('security_logs', ['severity']);
    await queryInterface.addIndex('security_logs', ['ip']);
    await queryInterface.addIndex('security_logs', ['email']);
    await queryInterface.addIndex('security_logs', ['createdAt']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('security_logs');
  }
};

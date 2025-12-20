import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const SecurityLog = sequelize.define('SecurityLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'LOGIN_FAILED, CSRF_ATTACK, RATE_LIMIT_BLOCKED, etc.'
  },
  severity: {
    type: DataTypes.ENUM('INFO', 'WARNING', 'HIGH', 'CRITICAL'),
    defaultValue: 'INFO'
  },
  ip: {
    type: DataTypes.STRING(45),
    allowNull: false,
    comment: 'IPv4 ou IPv6'
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Email tenté (si applicable)'
  },
  reason: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'USER_NOT_FOUND, INVALID_PASSWORD, etc.'
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  path: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Route appelée'
  },
  origin: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Origin header (pour CSRF)'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Données additionnelles'
  }
}, {
  tableName: 'security_logs',
  timestamps: true,
  indexes: [
    { fields: ['type'] },
    { fields: ['severity'] },
    { fields: ['ip'] },
    { fields: ['email'] },
    { fields: ['createdAt'] }
  ]
});

export default SecurityLog;


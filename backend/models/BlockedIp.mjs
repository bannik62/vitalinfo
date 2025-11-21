import { DataTypes } from 'sequelize';
import { sequelize } from './index.mjs';

const BlockedIp = sequelize.define('BlockedIp', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  ip: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  attempts: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  firstAttempt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  lastAttempt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  blocked: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  blockedUntil: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'BlockedIps',
  timestamps: true
});

export default BlockedIp;


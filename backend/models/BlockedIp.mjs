import { Sequelize, DataTypes } from 'sequelize';

const env = process.env.NODE_ENV || 'development';

// Utiliser les variables d'environnement en priorité, sinon fallback sur config.json
const dbConfig = {
  username: process.env.DB_USER || (env === 'production' ? 'root' : 'root'),
  password: process.env.DB_PASSWORD || (env === 'production' ? 'VITALINFO_sql_root_fixed!' : 'Superyoyo62**sql**vitalinfo'),
  database: process.env.DB_NAME || 'vitalinfo',
  host: process.env.DB_HOST || (env === 'production' ? 'mysql' : '127.0.0.1'),
  port: process.env.DB_PORT || 3306,
  dialect: 'mysql'
};

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect
  }
);

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
export { sequelize };


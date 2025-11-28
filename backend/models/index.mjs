
import { Sequelize } from 'sequelize';

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

// Log pour debug
console.log('DB Config:', {
  username: dbConfig.username,
  password: dbConfig.password ? '***' : 'UNDEFINED',
  database: dbConfig.database,
  host: dbConfig.host,
  port: dbConfig.port
});

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    dialectOptions: {
      ssl: false
    }
  }
);

// Import du modèle User (sera créé dynamiquement ou importé)
let User;
try {
  const userModule = await import('./user.cjs');
  User = userModule.default(sequelize, Sequelize.DataTypes);
} catch (error) {
  console.warn('Modèle User non trouvé, sera chargé depuis la base');
}

const db = {
  sequelize,
  Sequelize,
  User
};

export default db;
export { User };


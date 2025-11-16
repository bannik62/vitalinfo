import { Sequelize } from 'sequelize';
import config from '../config/config.json' assert { type: 'json' };

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

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


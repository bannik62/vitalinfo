'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

function buildConfig(hostDefault) {
  const password = process.env.DB_PASSWORD;
  if (!password) {
    throw new Error(
      'DB_PASSWORD must be set in the environment (sequelize-cli / migrations)'
    );
  }
  return {
    username: process.env.DB_USER || 'root',
    password,
    database: process.env.DB_NAME || 'vitalinfo',
    host: process.env.DB_HOST || hostDefault,
    port: Number(process.env.DB_PORT) || 3306,
    dialect: 'mysql'
  };
}

module.exports = {
  development: buildConfig('127.0.0.1'),
  test: buildConfig('127.0.0.1'),
  production: buildConfig('mysql')
};

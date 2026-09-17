import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { config } from './database';
import { entities } from '../models';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'mssql',
  host: process.env.DB_SERVER || config.server,
  port: parseInt(process.env.DB_PORT || '1433'),
  username: process.env.DB_USER || config.user,
  password: process.env.DB_PASSWORD || config.password,
  database: process.env.DB_DATABASE || config.database,

  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
    useUTC: true,
  },

  requestTimeout: 30000,
  connectionTimeout: 30000,

  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 60000,
  },

  entities: entities,

  migrations: [require('path').join(__dirname, '../migrations/*.{js,ts}')],
  migrationsTableName: 'typeorm_migrations',

  synchronize: false,
  logging: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
});

export const initializeDatabase = async (): Promise<void> => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
  } catch (error) {
    console.error('❌ Error initializing TypeORM DataSource:', error);
    throw error;
  }
};

export const closeDatabase = async (): Promise<void> => {
  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  } catch (error) {
    console.error('❌ Error closing TypeORM DataSource:', error);
    throw error;
  }
};

export const getDataSource = (): DataSource => {
  return AppDataSource;
};

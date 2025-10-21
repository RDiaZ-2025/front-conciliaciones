import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { config } from './database';
import { entities } from '../models';

// Load environment variables
dotenv.config();

/**
 * TypeORM DataSource configuration
 * This configuration is used for both runtime and CLI operations (migrations)
 */
export const AppDataSource = new DataSource({
  type: 'mssql',
  host: process.env.DB_SERVER || config.server,
  port: parseInt(process.env.DB_PORT || '1433'),
  username: process.env.DB_USER || config.user,
  password: process.env.DB_PASSWORD || config.password,
  database: process.env.DB_DATABASE || config.database,
  
  // Connection options
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
  },
  
  // Timeout settings
  requestTimeout: 30000,
  connectionTimeout: 30000,
  
  // Pool configuration
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 60000,
  },
  
  // Entity configuration
  entities: entities,
  
  // Migration configuration - detect if running from compiled code
  migrations: __filename.includes('dist') 
    ? ['dist/migrations/*.js'] 
    : ['src/migrations/*.ts'],
  migrationsTableName: 'typeorm_migrations',
  
  // Development settings
  synchronize: false, // Never use true in production
  logging: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
});

/**
 * Initialize TypeORM connection
 */
export const initializeDatabase = async (): Promise<void> => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ TypeORM DataSource initialized successfully');
      console.log(`📊 Database: ${config.database}`);
    } else {
      console.log('✅ TypeORM DataSource already initialized');
    }
  } catch (error) {
    console.error('❌ Error initializing TypeORM DataSource:', error);
    throw error;
  }
};

/**
 * Close TypeORM connection
 */
export const closeDatabase = async (): Promise<void> => {
  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('✅ TypeORM DataSource closed successfully');
    }
  } catch (error) {
    console.error('❌ Error closing TypeORM DataSource:', error);
    throw error;
  }
};

/**
 * Get TypeORM DataSource instance
 */
export const getDataSource = (): DataSource => {
  return AppDataSource;
};
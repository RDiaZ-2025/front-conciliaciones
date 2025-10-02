import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * TypeORM CLI Configuration
 * This file is used by TypeORM CLI for migration operations
 */
export default new DataSource({
  type: 'mssql',
  host: process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433'),
  username: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'VOC_DB',
  
  // Connection options
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
  },
  
  // Timeout settings
  requestTimeout: 30000,
  connectionTimeout: 30000,

  // Entity configuration
  entities: ['src/models/**/*.ts'],

  // Migration configuration
  migrations: ['src/migrations/*.ts'],
  migrationsTableName: 'typeorm_migrations',

  // CLI settings
  synchronize: false,
  logging: ['error', 'migration'],
});
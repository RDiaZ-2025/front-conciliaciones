import sql from 'mssql';
import { DatabaseConfig } from '../types';

export const config: DatabaseConfig = {
  server: process.env.DB_SERVER!,
  database: process.env.DB_DATABASE!,
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
    requestTimeout: 30000,
    connectionTimeout: 15000,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 60000,
  },
};

let pool: sql.ConnectionPool | null = null;

export const connectDB = async (): Promise<void> => {
  try {
    if (pool && pool.connected) {
      return;
    }

    pool = new sql.ConnectionPool(config);
    await pool.connect();


    // Configurar eventos de la conexión
    pool.on('error', (err: Error) => {
      console.error('❌ Error en la conexión de base de datos:', err);
      // Diagnóstico adicional
      if (err.message.includes('ECONNCLOSED')) {
        console.error('🔎 ECONNCLOSED: La conexión con SQL Server se cerró inesperadamente. Verifica credenciales, firewall y disponibilidad de Azure SQL.');
      }
    });
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error);
    if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string' && (error as any).message.includes('ECONNCLOSED')) {
      console.error('🔎 ECONNCLOSED: La conexión con SQL Server se cerró inesperadamente. Verifica credenciales, firewall y disponibilidad de Azure SQL.');
    }
    console.warn('⚠️ Continuando sin conexión a la base de datos para desarrollo');
    // No lanzar error para permitir que el servidor inicie
  }
};

export const getPool = (): sql.ConnectionPool | null => {
  return pool;
};

export const closeDB = async (): Promise<void> => {
  if (pool) {
    await pool.close();
    pool = null;
  }
};

export { sql };

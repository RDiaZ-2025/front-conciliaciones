import { z } from 'zod';
import dotenv from 'dotenv';

// Asegurarse de que dotenv esté cargado antes de la validación
dotenv.config();

const envSchema = z.object({
  // Servidor
  PORT: z.string().optional().default('22741'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().url().optional().default('http://localhost:5173'),

  // Base de Datos
  DB_SERVER: z.string().min(1, 'DB_SERVER es requerido'),
  DB_PORT: z.string().optional().default('1433'),
  DB_USER: z.string().min(1, 'DB_USER es requerido'),
  DB_PASSWORD: z.string().min(1, 'DB_PASSWORD es requerido'),
  DB_DATABASE: z.string().min(1, 'DB_DATABASE es requerido'),
  DB_ENCRYPT: z.enum(['true', 'false']).optional().default('true'),
  DB_TRUST_SERVER_CERTIFICATE: z.enum(['true', 'false']).optional().default('false'),

  // Autenticación
  JWT_SECRET: z.string().min(10, 'JWT_SECRET debe tener al menos 10 caracteres'),
  JWT_EXPIRES_IN: z.string().optional().default('24h'),
  JWT_REFRESH_EXPIRES_IN: z.string().optional().default('7d'),

  // Azure Storage (General)
  AZURE_STORAGE_ACCOUNT_NAME: z.string().optional(),
  AZURE_STORAGE_ACCOUNT_KEY: z.string().optional(),
  AZURE_STORAGE_CONTAINER_NAME: z.string().optional(),

  // Azure Autoconsumo Storage
  AZURE_AUTOCONSUMO_ACCOUNT_NAME: z.string().optional(),
  AZURE_AUTOCONSUMO_ACCOUNT_KEY: z.string().optional(),
  AZURE_AUTOCONSUMO_CONTAINER_NAME: z.string().optional(),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().optional().default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().optional().default('100'),

  // Logging
  LOG_LEVEL: z.string().optional().default('info'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export const validateEnv = (): EnvConfig => {
  try {
    const parsedEnv = envSchema.parse(process.env);

    // Asignar los valores parseados y validados de vuelta a process.env para que 
    // estén disponibles globalmente con los defaults correctos.
    for (const key in parsedEnv) {
      if (parsedEnv[key as keyof EnvConfig] !== undefined) {
        process.env[key] = parsedEnv[key as keyof EnvConfig];
      }
    }

    return parsedEnv;
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      console.error('❌ Error de validación de Variables de Entorno:');
      error.issues.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1); // Fail fast si faltan secretos críticos
    }
    throw error;
  }
};

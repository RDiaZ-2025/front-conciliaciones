import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({

  PORT: z.string().optional().default('22741'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().url().optional().default('http://localhost:5173'),

  DB_SERVER: z.string().min(1, 'DB_SERVER es requerido'),
  DB_PORT: z.string().optional().default('1433'),
  DB_USER: z.string().min(1, 'DB_USER es requerido'),
  DB_PASSWORD: z.string().min(1, 'DB_PASSWORD es requerido'),
  DB_DATABASE: z.string().min(1, 'DB_DATABASE es requerido'),
  DB_ENCRYPT: z.enum(['true', 'false']).optional().default('true'),
  DB_TRUST_SERVER_CERTIFICATE: z.enum(['true', 'false']).optional().default('false'),

  JWT_SECRET: z.string().min(10, 'JWT_SECRET debe tener al menos 10 caracteres'),
  JWT_EXPIRES_IN: z.string().optional().default('24h'),
  JWT_REFRESH_EXPIRES_IN: z.string().optional().default('7d'),

  AZURE_STORAGE_ACCOUNT_NAME: z.string().optional(),
  AZURE_STORAGE_ACCOUNT_KEY: z.string().optional(),
  AZURE_STORAGE_CONTAINER_NAME: z.string().optional(),

  AZURE_AUTOCONSUMO_ACCOUNT_NAME: z.string().optional(),
  AZURE_AUTOCONSUMO_ACCOUNT_KEY: z.string().optional(),
  AZURE_AUTOCONSUMO_CONTAINER_NAME: z.string().optional(),

  AZURE_SERVICE_BUS_CONNECTION_STRING: z.string().optional(),
  AZURE_SERVICE_BUS_QUEUE_NAME: z.string().optional().default('noc-news-schedules'),

  RATE_LIMIT_WINDOW_MS: z.string().optional().default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().optional().default('100'),

  LOG_LEVEL: z.string().optional().default('info'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export const validateEnv = (): EnvConfig => {
  try {
    const parsedEnv = envSchema.parse(process.env);

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
      process.exit(1);
    }
    throw error;
  }
};

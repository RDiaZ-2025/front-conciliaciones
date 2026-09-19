import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import productionRoutes from './routes/production.routes';
import teamRoutes from './routes/team.routes';
import menuRoutes from './routes/menu.routes';
import permissionRoutes from './routes/permission.routes';
import cover15MinuteRoutes from './routes/cover_15_minute.routes';
import storageRoutes from './routes/storage.routes';
import notificationRoutes from './routes/notification.routes';
import objectiveRoutes from './routes/objective.routes';
import audienceRoutes from './routes/audience.routes';
import statusRoutes from './routes/status.routes';
import campaignRoutes from './routes/campaign.routes';
import nocRoutes from './routes/noc.routes';
import customerRoutes from './routes/customer.routes';

import { actionLogger, skipLogging } from './middleware/actionLogger';
import { azureServiceBusSchedulerService } from './services/azure_service_bus_scheduler.service';

dotenv.config();

const app = express();

app.set('trust proxy', 1);

const isProduction = process.env.NODE_ENV === 'production';

const allowedOrigins: string[] = [
  'https://vocclaromedia.com',
  'https://www.vocclaromedia.com',
  'https://blue-pebble-080603f0f.3.azurestaticapps.net',
  'https://wonderful-coast-0c074260f.7.azurestaticapps.net'
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

if (!isProduction || process.env.ALLOW_LOCALHOST_CORS === 'true') {
  allowedOrigins.push('http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000');
}

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    if (!isProduction && (
      origin.endsWith('.app.github.dev') ||
      origin.endsWith('.trycloudflare.com') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.startsWith('http://192.168.') ||
      origin.startsWith('http://10.') ||
      origin.startsWith('http://172.')
    )) {
      return callback(null, true);
    }
    return callback(new Error(`Acceso denegado por CORS para el origen: ${origin}`));
  },
  credentials: true,
  optionsSuccessStatus: 200
};

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.'
  }
});

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'sameorigin'
  }
}));
app.use(cors(corsOptions));
app.use(compression());
app.use(morgan('combined'));
if (process.env.NODE_ENV === 'production') {
  app.use(limiter);
}
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

import path from 'path';
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use(actionLogger);

import { AppDataSource } from './config/typeorm.config';

const formatUptime = (seconds: number): string => {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
};

const getHealthPayload = () => {
  const mem = process.memoryUsage();
  const uptimeSec = Math.floor(process.uptime());
  const sbStatus = azureServiceBusSchedulerService.getStatus();
  const dbConnected = AppDataSource.isInitialized;

  return {
    success: true,
    status: (dbConnected && (!sbStatus.hasConnectionString || sbStatus.receiverListening)) ? 'healthy' : 'degraded',
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: {
      seconds: uptimeSec,
      formatted: formatUptime(uptimeSec)
    },
    database: {
      status: dbConnected ? 'connected' : 'disconnected',
      name: process.env.DB_DATABASE || 'voc_db'
    },
    serviceBus: sbStatus,
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      memory: {
        rssMB: Math.round(mem.rss / 1024 / 1024 * 100) / 100,
        heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100,
        heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024 * 100) / 100
      }
    }
  };
};

app.get('/', skipLogging, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'VOC Backend API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get(['/health', '/api/health'], skipLogging, (req, res) => {
  res.status(200).json(getHealthPayload());
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/menus', menuRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/covers-15-minutes', cover15MinuteRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/objectives', objectiveRoutes);
app.use('/api/audience', audienceRoutes);
app.use('/api/statuses', statusRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api', nocRoutes);
app.use('/api/customers', customerRoutes);

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

import { errorHandler } from './middleware/errorHandler';

app.use(errorHandler);

export default app;

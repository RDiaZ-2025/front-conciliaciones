import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import loadDocumentsOCbyUserRouter from './routes/loadDocumentsOCbyUser';

// Importar rutas
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import productionRoutes from './routes/productionRoutes';
import menuRoutes from './routes/menuRoutes';

// Importar middleware de logging
import { actionLogger, skipLogging } from './middleware/actionLogger';

// Cargar variables de entorno
dotenv.config();

const app = express();

// Configuración de CORS
const corsOptions = {
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5173', // Desarrollo local
    'http://localhost:5174', // Puerto alternativo cuando 5173 está ocupado
    'https://blue-pebble-080603f0f.azurestaticapps.net', // Producción (URL anterior)
    'https://blue-pebble-080603f0f.3.azurestaticapps.net' // Producción (URL actual)
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

// Configuración de Rate Limiting (temporalmente deshabilitado)
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutos
//   max: 100, // límite de requests por ventana
//   message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.'
// });

// Middlewares globales
app.use(helmet()); // Seguridad
app.use(cors(corsOptions)); // CORS
app.use(compression()); // Compresión
app.use(morgan('combined')); // Logging
// app.use(limiter); // Rate limiting (temporalmente deshabilitado)
app.use(cookieParser()); // Cookies
app.use(express.json({ limit: '10mb' })); // JSON parser
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // URL encoded

// Middleware de logging de acciones de usuario
app.use(actionLogger);

// Ruta de salud (sin logging para evitar spam en los logs)
app.get('/health', skipLogging, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/load-documents', loadDocumentsOCbyUserRouter);
app.use('/api/production', productionRoutes);
app.use('/api/menus', menuRoutes);

// Ruta 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

// Middleware de manejo de errores
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error no manejado:', err);
  
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { error: err.message })
  });
});

export default app;
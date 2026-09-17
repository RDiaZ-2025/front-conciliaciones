import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const authController = new AuthController();

// Rate limiter específico para prevenir ataques de fuerza bruta en inicio de sesión
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // Máximo 10 intentos por IP en 15 minutos
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiados intentos de inicio de sesión desde esta IP. Por seguridad, intente de nuevo en 15 minutos.'
  }
});

// Ruta de login protegida por rate limiter
router.post('/login', loginLimiter, authController.login);

// Ruta para verificar token
router.get('/verify', authenticateToken, authController.me);

// Ruta para obtener información del usuario actual
router.get('/me', authenticateToken, authController.me);

// Ruta de logout
router.post('/logout', authController.logout);

export default router;
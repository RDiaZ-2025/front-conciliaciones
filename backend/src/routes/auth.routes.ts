import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const authController = new AuthController();

const loginLimiter = rateLimit({
  windowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutos
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX || '100'), // 100 intentos permitidos desde la misma IP
  skipSuccessfulRequests: true, // Las conexiones exitosas no consumen el límite, solo intentos fallidos
  standardHeaders: true,
  legacyHeaders: false,
  validate: { ip: false },
  message: {
    success: false,
    message: 'Demasiados intentos fallidos de inicio de sesión desde esta IP. Por seguridad, intente de nuevo en 15 minutos.'
  }
});

router.post('/login', loginLimiter, authController.login);

router.get('/verify', authenticateToken, authController.me);

router.get('/me', authenticateToken, authController.me);

router.post('/logout', authController.logout);

// Limita solo intentos FALLIDOS de cambio de contraseña (evita adivinar la contraseña actual por fuerza bruta)
const changePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { ip: false },
  message: {
    success: false,
    message: 'Demasiados intentos fallidos de cambio de contraseña. Intente de nuevo en 15 minutos.'
  }
});

router.post('/change-password', authenticateToken, changePasswordLimiter, authController.changePassword);

export default router;

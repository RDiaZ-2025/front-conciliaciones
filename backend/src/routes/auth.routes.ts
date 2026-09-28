import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const authController = new AuthController();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiados intentos de inicio de sesión desde esta IP. Por seguridad, intente de nuevo en 15 minutos.'
  }
});

router.post('/login', loginLimiter, authController.login);

router.get('/verify', authenticateToken, authController.me);

router.get('/me', authenticateToken, authController.me);

router.post('/logout', authController.logout);

export default router;

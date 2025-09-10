import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateToken, requirePermission } from '../middleware/auth';

const router = Router();

// Ruta de login
router.post('/login', AuthController.login);

// Ruta para verificar token
router.get('/verify', authenticateToken, AuthController.me);

// Ruta para obtener información del usuario actual
router.get('/me', authenticateToken, AuthController.me);

// Ruta de logout
router.post('/logout', AuthController.logout);

// Ruta para inicializar usuarios (solo para desarrollo) - requiere permisos de administrador
router.post('/initialize-users', authenticateToken, requirePermission('SYSTEM_CONFIG'), AuthController.initializeUsers);

export default router;
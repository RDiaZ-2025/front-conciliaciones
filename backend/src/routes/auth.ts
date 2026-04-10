import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateToken, requirePermission } from '../middleware/auth';

const router = Router();
const authController = new AuthController();

// Ruta de login
router.post('/login', authController.login);

// Ruta para verificar token
router.get('/verify', authenticateToken, authController.me);

// Ruta para obtener información del usuario actual
router.get('/me', authenticateToken, authController.me);

// Ruta de logout
router.post('/logout', authController.logout);

// Ruta para inicializar usuarios (solo para desarrollo) - requiere permisos de administrador
router.post('/initialize-users', authenticateToken, requirePermission('admin_panel'), authController.initializeUsers);

export default router;
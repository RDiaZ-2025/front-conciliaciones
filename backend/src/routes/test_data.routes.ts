import { Router } from 'express'
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

export default router;
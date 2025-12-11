import { Router } from 'express';
import { getAllPermissions } from '../controllers/permissionController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, getAllPermissions);

export default router;

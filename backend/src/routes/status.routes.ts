import { Router } from 'express';
import { getAllStatuses } from '../controllers/status.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, getAllStatuses);

export default router;

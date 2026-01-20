import { Router } from 'express';
import { getAllStatuses } from '../controllers/statusController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, getAllStatuses);

export default router;

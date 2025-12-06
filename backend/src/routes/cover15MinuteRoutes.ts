import { Router } from 'express';
import { Cover15MinuteController } from '../controllers/Cover15MinuteController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const controller = new Cover15MinuteController();

router.post('/', authenticateToken, controller.saveCover);
router.get('/', authenticateToken, controller.getAllCovers);

export default router;


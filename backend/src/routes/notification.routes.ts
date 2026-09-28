import { Router } from 'express';
import { getUserNotifications, markAsRead, markAllAsRead } from '../controllers/notification.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', getUserNotifications);

router.put('/read-all', markAllAsRead);

router.put('/:id/read', markAsRead);

export default router;

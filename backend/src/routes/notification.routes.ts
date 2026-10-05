import { Router } from 'express';
import { getUserNotifications, markAsRead, markAllAsRead, streamNotifications, sendCustomNotification } from '../controllers/notification.controller';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', getUserNotifications);

router.get('/stream', streamNotifications);

router.post('/send-custom', requireRole(['admin']), sendCustomNotification);

router.put('/read-all', markAllAsRead);

router.put('/:id/read', markAsRead);

export default router;

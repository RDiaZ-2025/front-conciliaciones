import { Router } from 'express';
import { getUserNotifications, markAsRead, markAllAsRead } from '../controllers/notificationController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all notifications for the current user
router.get('/', getUserNotifications);

// Mark all notifications as read
router.put('/read-all', markAllAsRead);

// Mark a specific notification as read
router.put('/:id/read', markAsRead);

export default router;

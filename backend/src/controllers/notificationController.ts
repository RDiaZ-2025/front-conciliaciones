import { Request, Response } from 'express';
import { NotificationService } from '../services/notificationService';
import { asyncHandler } from "../utils/asyncHandler";

const notificationService = new NotificationService();

export const getUserNotifications = asyncHandler(async (req: Request, res: Response) => {
const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const notifications = await notificationService.getUserNotifications(userId);
        const unreadCount = await notificationService.getUnreadCount(userId);

        return res.json({
            success: true,
            data: {
                notifications,
                unreadCount
            }
        });
});

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
const userId = req.user?.userId;
        const notificationId = parseInt(req.params.id);

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        if (isNaN(notificationId)) {
            return res.status(400).json({ success: false, message: 'Invalid notification ID' });
        }

        const notification = await notificationService.markAsRead(userId, notificationId);
        
        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        return res.json({ success: true, data: notification });
});

export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        await notificationService.markAllAsRead(userId);

        return res.json({ success: true, message: 'All notifications marked as read' });
});

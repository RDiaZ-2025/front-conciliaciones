import { Request, Response } from 'express';
import { NotificationService } from '../services/notificationService';

const notificationService = new NotificationService();

export const getUserNotifications = async (req: Request, res: Response) => {
    try {
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
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const markAsRead = async (req: Request, res: Response) => {
    try {
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
    } catch (error) {
        console.error('Error marking notification as read:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const markAllAsRead = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        await notificationService.markAllAsRead(userId);

        return res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

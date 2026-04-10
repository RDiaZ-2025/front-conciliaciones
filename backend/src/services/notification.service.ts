import { AppDataSource } from '../config/typeorm.config';
import { Notification } from '../models/Notification';
import { User } from '../models/User';

export class NotificationService {
    private notificationRepository = AppDataSource.getRepository(Notification);
    private userRepository = AppDataSource.getRepository(User);

    /**
     * Get all notifications for a specific user
     * @param userId User ID
     * @param limit Limit results (default 50)
     * @returns List of notifications
     */
    async getUserNotifications(userId: number, limit: number = 50): Promise<Notification[]> {
        return this.notificationRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
            take: limit
        });
    }

    /**
     * Get unread notifications count for a user
     * @param userId User ID
     * @returns Count of unread notifications
     */
    async getUnreadCount(userId: number): Promise<number> {
        return this.notificationRepository.count({
            where: { 
                userId, 
                isRead: false 
            }
        });
    }

    /**
     * Mark a notification as read
     * @param userId User ID (for security check)
     * @param notificationId Notification ID
     * @returns Updated notification or null if not found/unauthorized
     */
    async markAsRead(userId: number, notificationId: number): Promise<Notification | null> {
        const notification = await this.notificationRepository.findOne({
            where: { id: notificationId, userId }
        });

        if (!notification) {
            return null;
        }

        notification.isRead = true;
        return this.notificationRepository.save(notification);
    }

    /**
     * Mark all notifications as read for a user
     * @param userId User ID
     */
    async markAllAsRead(userId: number): Promise<void> {
        await this.notificationRepository.update(
            { userId, isRead: false },
            { isRead: true }
        );
    }

    /**
     * Create a new notification for a user
     * @param userId User ID
     * @param title Title
     * @param message Message
     * @param type Notification type
     * @returns Created notification
     */
    async createNotification(
        userId: number, 
        title: string, 
        message: string, 
        type: 'info' | 'success' | 'warning' | 'error' = 'info'
    ): Promise<Notification> {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new Error('User not found');
        }

        const notification = new Notification();
        notification.userId = userId;
        notification.title = title;
        notification.message = message;
        notification.type = type;
        notification.isRead = false;

        return this.notificationRepository.save(notification);
    }
}

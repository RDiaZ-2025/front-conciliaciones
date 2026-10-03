import { Response } from 'express';
import { AppDataSource } from '../config/typeorm.config';
import { Notification } from '../models/Notification';
import { User } from '../models/User';

export class NotificationService {
    private notificationRepository = AppDataSource.getRepository(Notification);
    private userRepository = AppDataSource.getRepository(User);
    private static sseClients: Map<number, Set<Response>> = new Map();

    addSSEClient(userId: number, res: Response): void {
        if (!NotificationService.sseClients.has(userId)) {
            NotificationService.sseClients.set(userId, new Set());
        }
        NotificationService.sseClients.get(userId)!.add(res);
    }

    removeSSEClient(userId: number, res: Response): void {
        const clients = NotificationService.sseClients.get(userId);
        if (clients) {
            clients.delete(res);
            if (clients.size === 0) {
                NotificationService.sseClients.delete(userId);
            }
        }
    }

    sendToUser(userId: number, notification: Notification): void {
        const clients = NotificationService.sseClients.get(userId);
        if (clients && clients.size > 0) {
            const data = `data: ${JSON.stringify(notification)}\n\n`;
            for (const client of clients) {
                try {
                    client.write(data);
                    if (typeof (client as any).flush === 'function') {
                        (client as any).flush();
                    }
                } catch (err) {
                    console.error(`Error sending SSE to user ${userId}:`, err);
                }
            }
        }
    }

    async getUserNotifications(userId: number, limit: number = 50): Promise<Notification[]> {
        return this.notificationRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
            take: limit
        });
    }

    async getUnreadCount(userId: number): Promise<number> {
        return this.notificationRepository.count({
            where: {
                userId,
                isRead: false
            }
        });
    }

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

    async markAllAsRead(userId: number): Promise<void> {
        await this.notificationRepository.update(
            { userId, isRead: false },
            { isRead: true }
        );
    }

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

        const savedNotification = await this.notificationRepository.save(notification);
        this.sendToUser(userId, savedNotification);
        return savedNotification;
    }
}

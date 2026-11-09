import { Response } from 'express';
import { AppDataSource } from '../config/typeorm.config';
import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { DynamicSubmissionWorkflowState } from '../models/DynamicSubmissionWorkflowState';
import { DynamicFormSubmission } from '../models/DynamicFormSubmission';

export class NotificationService {
    private notificationRepository = AppDataSource.getRepository(Notification);
    private userRepository = AppDataSource.getRepository(User);
    private static sseClients: Map<number, Set<Response>> = new Map();

    private extractSubmissionIdFromText(title?: string, message?: string): number | null {
        const combined = `${title || ''} ${message || ''}`;
        const hashMatch = combined.match(/#(\d+)/);
        if (hashMatch && hashMatch[1]) {
            const parsed = parseInt(hashMatch[1], 10);
            if (!isNaN(parsed) && parsed > 0) return parsed;
        }
        const solMatch = combined.match(/solicitud\s+(?:n[°ºo.]?\s*)?(\d+)/i);
        if (solMatch && solMatch[1]) {
            const parsed = parseInt(solMatch[1], 10);
            if (!isNaN(parsed) && parsed > 0) return parsed;
        }
        return null;
    }

    addSSEClient(userId: number, res: Response): void {
        const id = Number(userId);
        if (isNaN(id)) return;
        if (!NotificationService.sseClients.has(id)) {
            NotificationService.sseClients.set(id, new Set());
        }
        NotificationService.sseClients.get(id)!.add(res);
    }

    removeSSEClient(userId: number, res: Response): void {
        const id = Number(userId);
        if (isNaN(id)) return;
        const clients = NotificationService.sseClients.get(id);
        if (clients) {
            clients.delete(res);
            if (clients.size === 0) {
                NotificationService.sseClients.delete(id);
            }
        }
    }

    sendToUser(userId: number, notification: Notification): void {
        const id = Number(userId);
        if (isNaN(id)) return;
        const clients = NotificationService.sseClients.get(id);
        if (clients && clients.size > 0) {
            const data = `data: ${JSON.stringify(notification)}\n\n`;
            for (const client of clients) {
                try {
                    client.write(data);
                    if (typeof (client as any).flush === 'function') {
                        (client as any).flush();
                    }
                } catch (err) {
                    console.error(`Error sending SSE to user ${id}:`, err);
                }
            }
        }
    }

    async getUserNotifications(userId: number, limit: number = 50): Promise<Array<Notification & { submissionId?: number | null }>> {
        const list = await this.notificationRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
            take: limit
        });

        const enriched: Array<Notification & { submissionId?: number | null }> = list.map(n => {
            const subId = this.extractSubmissionIdFromText(n.title, n.message);
            return Object.assign(n, { submissionId: subId });
        });

        const needsResolution = enriched.filter(n => !n.submissionId && this.isWorkflowNotification(n.title, n.message));
        if (needsResolution.length > 0 && AppDataSource.isInitialized) {
            try {
                const stateRepo = AppDataSource.getRepository(DynamicSubmissionWorkflowState);
                const subRepo = AppDataSource.getRepository(DynamicFormSubmission);

                const [userStates, userSubs] = await Promise.all([
                    stateRepo.find({
                        where: { assignedUserId: userId },
                        select: ['id', 'submissionId', 'createdAt', 'updatedAt'],
                        order: { createdAt: 'DESC' },
                        take: 300
                    }),
                    subRepo.find({
                        where: { requesterUserId: userId },
                        select: ['id', 'createdAt'],
                        order: { createdAt: 'DESC' },
                        take: 200
                    })
                ]);

                for (const notif of needsResolution) {
                    const nTime = new Date(notif.createdAt).getTime();
                    if (isNaN(nTime)) continue;

                    let bestSubId: number | null = null;
                    let bestDiff = Infinity;

                    for (const st of userStates) {
                        const cDiff = Math.abs(nTime - new Date(st.createdAt).getTime());
                        if (cDiff <= 120000 && cDiff < bestDiff) {
                            bestDiff = cDiff;
                            bestSubId = st.submissionId;
                        }
                        if (st.updatedAt) {
                            const uDiff = Math.abs(nTime - new Date(st.updatedAt).getTime());
                            if (uDiff <= 120000 && uDiff < bestDiff) {
                                bestDiff = uDiff;
                                bestSubId = st.submissionId;
                            }
                        }
                    }

                    for (const sub of userSubs) {
                        const cDiff = Math.abs(nTime - new Date(sub.createdAt).getTime());
                        if (cDiff <= 120000 && cDiff < bestDiff) {
                            bestDiff = cDiff;
                            bestSubId = sub.id;
                        }
                    }

                    if (bestSubId) {
                        notif.submissionId = bestSubId;
                    }
                }
            } catch (err) {
                console.error('Error resolving historical notification submissionIds:', err);
            }
        }

        return enriched;
    }

    private isWorkflowNotification(title?: string, message?: string): boolean {
        const text = `${title || ''} ${message || ''}`.toLowerCase();
        return (
            text.includes('solicitud') ||
            text.includes('tarea') ||
            text.includes('flujo') ||
            text.includes('etapa') ||
            text.includes('revisión') ||
            text.includes('aprobación') ||
            text.includes('cierre') ||
            text.includes('comentario')
        );
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
        type: 'info' | 'success' | 'warning' | 'error' = 'info',
        submissionId?: number | null
    ): Promise<Notification & { submissionId?: number | null }> {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new Error('User not found');
        }

        const resolvedSubId = (submissionId && Number(submissionId) > 0)
            ? Number(submissionId)
            : this.extractSubmissionIdFromText(title, message);

        let finalMessage = message;
        if (resolvedSubId && !this.extractSubmissionIdFromText(title, message)) {
            finalMessage = `${message} (Solicitud #${resolvedSubId})`;
        }

        const notification = new Notification();
        notification.userId = userId;
        notification.title = title;
        notification.message = finalMessage;
        notification.type = type;
        notification.isRead = false;

        const savedNotification = await this.notificationRepository.save(notification);
        const enrichedNotification = Object.assign(savedNotification, { submissionId: resolvedSubId });
        this.sendToUser(userId, enrichedNotification);
        return enrichedNotification;
    }
}

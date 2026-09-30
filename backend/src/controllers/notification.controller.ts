import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { asyncHandler } from "../utils/asyncHandler";

const notificationService = new NotificationService();

export const getUserNotifications = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
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
        return res.status(401).json({ success: false, message: 'No autorizado' });
    }

    if (isNaN(notificationId)) {
        return res.status(400).json({ success: false, message: 'ID de notificación inválido' });
    }

    const notification = await notificationService.markAsRead(userId, notificationId);

    if (!notification) {
        return res.status(404).json({ success: false, message: 'Notificación no encontrada' });
    }

    return res.json({ success: true, data: notification });
});

export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
    }

    await notificationService.markAllAsRead(userId);

    return res.json({ success: true, message: 'Todas las notificaciones fueron marcadas como leídas' });
});

export const streamNotifications = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
        res.status(401).json({ success: false, message: 'No autorizado' });
        return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Notificar al cliente que la conexión fue exitosa
    res.write(`data: ${JSON.stringify({ type: 'connected', userId, timestamp: new Date().toISOString() })}\n\n`);
    if (typeof (res as any).flush === 'function') {
        (res as any).flush();
    }

    notificationService.addSSEClient(userId, res);

    // Enviar heartbeat cada 25 segundos para mantener la conexión viva
    const heartbeat = setInterval(() => {
        try {
            res.write(': keep-alive\n\n');
            if (typeof (res as any).flush === 'function') {
                (res as any).flush();
            }
        } catch {
            clearInterval(heartbeat);
        }
    }, 25000);

    req.on('close', () => {
        clearInterval(heartbeat);
        notificationService.removeSSEClient(userId, res);
    });
});


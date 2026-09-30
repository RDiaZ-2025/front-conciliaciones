import { BaseApiService } from './base-api.service';
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: string;
}

export interface NotificationResponse {
  success: boolean;
  data: {
    notifications: Notification[];
    unreadCount: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService extends BaseApiService {
  private apiUrl = `${environment.apiUrl}/notifications`;

  notifications = signal<Notification[]>([]);
  unreadCount = signal<number>(0);
  browserPermission = signal<NotificationPermission>('default');
  isRealtimeActive = signal<boolean>(false);

  notificationClicked$ = new Subject<Notification>();

  private eventSource: EventSource | null = null;
  private pollInterval: any = null;
  private swRegistration: ServiceWorkerRegistration | null = null;

  initBrowserNotifications(): void {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.browserPermission.set(Notification.permission);
    }

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((reg) => {
          this.swRegistration = reg;
        })
        .catch((err) => {
          console.warn('No se pudo registrar sw.js para notificaciones push:', err);
        });

      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'VOC_NOTIFICATION_CLICK' && event.data?.notification) {
          this.notificationClicked$.next(event.data.notification);
        }
      });
    }
  }

  async requestBrowserPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      this.browserPermission.set(permission);
      return permission;
    } catch (err) {
      console.error('Error solicitando permisos de notificación:', err);
      return 'denied';
    }
  }

  startRealtime(): void {
    const token = localStorage.getItem('auth_token');
    if (!token || token === 'null' || token === 'undefined') {
      return;
    }

    if (this.eventSource) {
      return;
    }

    try {
      const streamUrl = `${this.apiUrl}/stream?token=${encodeURIComponent(token)}`;
      this.eventSource = new EventSource(streamUrl);

      this.eventSource.onopen = () => {
        this.isRealtimeActive.set(true);
      };

      this.eventSource.onmessage = (event) => {
        if (!event.data || event.data.trim() === '') return;

        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'connected') {
            return;
          }

          const notification: Notification = payload;
          const currentList = this.notifications();
          if (!currentList.some(n => n.id === notification.id)) {
            this.notifications.set([notification, ...currentList]);
            this.unreadCount.update(count => count + 1);
            this.showBrowserPushNotification(notification);
          }
        } catch (err) {
          console.error('Error parseando notificación en tiempo real:', err);
        }
      };

      this.eventSource.onerror = () => {
        this.isRealtimeActive.set(false);
      };
    } catch (err) {
      console.error('Error iniciando stream de notificaciones:', err);
    }

    // Intervalo de respaldo para mantener sincronizado el conteo
    if (!this.pollInterval) {
      this.pollInterval = setInterval(() => {
        const activeToken = localStorage.getItem('auth_token');
        if (activeToken && activeToken !== 'null' && activeToken !== 'undefined') {
          this.loadNotifications();
        } else {
          this.stopRealtime();
        }
      }, 45000);
    }
  }

  stopRealtime(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isRealtimeActive.set(false);
  }

  showBrowserPushNotification(notification: Notification): void {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    if (Notification.permission !== 'granted') {
      return;
    }

    const title = notification.title || 'Nueva Notificación VOC';
    const options: any = {
      body: notification.message || '',
      icon: '/assets/claro-media-logo.png',
      badge: '/favicon-32x32.png',
      tag: `voc-notif-${notification.id}`,
      data: notification,
      requireInteraction: false
    };

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && this.swRegistration) {
      this.swRegistration.showNotification(title, options).catch(() => {
        this.fallbackNativeNotification(notification, title, options);
      });
    } else {
      this.fallbackNativeNotification(notification, title, options);
    }
  }

  private fallbackNativeNotification(notification: Notification, title: string, options: any): void {
    try {
      const nativeNotif = new Notification(title, {
        body: options.body,
        icon: options.icon,
        tag: options.tag
      });

      nativeNotif.onclick = () => {
        if (typeof window !== 'undefined') {
          window.focus();
        }
        this.notificationClicked$.next(notification);
        nativeNotif.close();
      };
    } catch (e) {
      console.warn('No se pudo desplegar la notificación nativa:', e);
    }
  }

  loadNotifications(): void {
    this.http.get<NotificationResponse>(this.apiUrl).subscribe({
      next: (response) => {
        if (response.success) {
          this.notifications.set(response.data.notifications);
          this.unreadCount.set(response.data.unreadCount);
        }
      },
      error: (error) => console.error('Error loading notifications:', error)
    });
  }

  markAsRead(id: number): Observable<{ success: boolean; data: Notification }> {
    return this.http.put<{ success: boolean; data: Notification }>(`${this.apiUrl}/${id}/read`, {}).pipe(
      tap((response) => {
        if (response.success) {
          this.notifications.update(list =>
            list.map(n => n.id === id ? { ...n, isRead: true } : n)
          );
          this.unreadCount.update(count => Math.max(0, count - 1));
        }
      })
    );
  }

  markAllAsRead(): Observable<{ success: boolean; message: string }> {
    return this.http.put<{ success: boolean; message: string }>(`${this.apiUrl}/read-all`, {}).pipe(
      tap((response) => {
        if (response.success) {
          this.notifications.update(list =>
            list.map(n => ({ ...n, isRead: true }))
          );
          this.unreadCount.set(0);
        }
      })
    );
  }
}


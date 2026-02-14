import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
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
export class NotificationService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/notifications`;

  // Signals for reactive state
  notifications = signal<Notification[]>([]);
  unreadCount = signal<number>(0);

  /**
   * Load user notifications and update signals
   */
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

  /**
   * Mark a notification as read
   * @param id Notification ID
   */
  markAsRead(id: number): Observable<{ success: boolean; data: Notification }> {
    return this.http.put<{ success: boolean; data: Notification }>(`${this.apiUrl}/${id}/read`, {}).pipe(
      tap((response) => {
        if (response.success) {
          // Update local state
          this.notifications.update(list => 
            list.map(n => n.id === id ? { ...n, isRead: true } : n)
          );
          // Recalculate unread count
          this.unreadCount.update(count => Math.max(0, count - 1));
        }
      })
    );
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): Observable<{ success: boolean; message: string }> {
    return this.http.put<{ success: boolean; message: string }>(`${this.apiUrl}/read-all`, {}).pipe(
      tap((response) => {
        if (response.success) {
          // Update local state
          this.notifications.update(list => 
            list.map(n => ({ ...n, isRead: true }))
          );
          this.unreadCount.set(0);
        }
      })
    );
  }
}

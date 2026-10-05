import { LucideIconComponent } from '../lucide-icon/lucide-icon.component';
import { CachedImagePipe } from '../../pipes/cached-image.pipe';
import { CoreDialogService } from '../../services/core-dialog.service';
import { DialogService } from 'primeng/dynamicdialog';
import { Component, inject, signal, computed, effect, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { DrawerModule } from 'primeng/drawer';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { AvatarModule } from 'primeng/avatar';
import { StyleClassModule } from 'primeng/styleclass';
import { PopoverModule } from 'primeng/popover';
import { BadgeModule } from 'primeng/badge';
import { MenuModule } from 'primeng/menu';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { FormsModule } from '@angular/forms';
import { MenuItem as PrimeMenuItem, MessageService } from 'primeng/api';

import { AuthService } from '../../services/auth.service';
import { UserService, User as VOCUser } from '../../services/user.service';
import { MenuService, MenuItem } from '../../services/menu.service';
import { NotificationService, Notification } from '../../services/notification.service';
import { ProductionService } from '../../services/production.service';
import { ProductionDialogComponent } from '../../pages/production_2/production-dialog/production-dialog.component';
import { SystemHealthModalComponent } from '../system-health-modal/system-health-modal.component';
import { SystemHealthService } from '../../services/system-health.service';
import { PERMISSIONS } from '../../constants/permissions';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    LucideIconComponent,
    CachedImagePipe,
    CommonModule,
    FormsModule,
    RouterOutlet,
    DrawerModule,
    ToolbarModule,
    ButtonModule,
    RippleModule,
    AvatarModule,
    StyleClassModule,
    PopoverModule,
    BadgeModule,
    MenuModule,
    DialogModule,
    SelectModule,
    InputTextModule,
    TextareaModule,
    ToastModule,
    TooltipModule,
    SystemHealthModalComponent
  ],
  providers: [DialogService, MessageService],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss'
})
export class LayoutComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private messageService = inject(MessageService);
  private menuService = inject(MenuService);
  private notificationService = inject(NotificationService);
  private productionService = inject(ProductionService);
  private dialogService = inject(CoreDialogService);
  private router = inject(Router);
  private healthService = inject(SystemHealthService);

  appVersion = this.healthService.appVersion;
  frontendVersion = this.healthService.frontendVersion;
  backendVersion = this.healthService.backendVersion;

  menuItems = signal<MenuItem[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  currentUser = this.authService.currentUser;
  isAdmin = computed(() => this.authService.isAdmin());
  canViewHealthBottom = computed(() => 
    this.authService.isAdmin() && this.authService.hasPermission(PERMISSIONS.HEALTH_CHECKER)
  );

  notifications = this.notificationService.notifications;
  unreadCount = this.notificationService.unreadCount;
  browserPermission = this.notificationService.browserPermission;

  private notifSub: Subscription | null = null;

  expandedItems = signal<Set<number>>(new Set());

  isDrawerOpen = false;
  showHealthModal = signal(false);

  isDarkMode = signal(false);

  // Modal para envío de notificaciones personalizadas (Admin)
  showSendNotificationModal = signal<boolean>(false);
  adminUsersList = signal<VOCUser[]>([]);
  loadingUsers = signal<boolean>(false);
  sendingNotification = signal<boolean>(false);

  selectedTargetUser = signal<VOCUser | null>(null);
  customNotifTitle = signal<string>('Mensaje de Administración');
  customNotifMessage = signal<string>('');
  customNotifType = signal<'info' | 'warning' | 'success' | 'error'>('info');

  notifTypeOptions = [
    { label: 'Informativa (Azul)', value: 'info' },
    { label: 'Éxito (Verde)', value: 'success' },
    { label: 'Advertencia (Amarillo)', value: 'warning' },
    { label: 'Alerta / Error (Rojo)', value: 'error' }
  ];

  userMenuItems: PrimeMenuItem[] = [
    {
      label: 'Cerrar Sesión',
      icon: 'power',
      command: () => this.logout()
    }
  ];

  constructor() {
    this.initTheme();
  }

  ngOnInit() {
    this.fetchMenuItems();
    this.notificationService.initBrowserNotifications();
    this.notificationService.loadNotifications();
    this.notificationService.startRealtime();
    this.healthService.getHealth().subscribe();

    this.notifSub = this.notificationService.notificationClicked$.subscribe((notification) => {
      this.handleNotificationClick(notification);
    });
  }

  ngOnDestroy() {
    if (this.notifSub) {
      this.notifSub.unsubscribe();
      this.notifSub = null;
    }
    this.notificationService.stopRealtime();
  }

  openSendNotificationModal(): void {
    this.customNotifTitle.set('Mensaje de Administración');
    this.customNotifMessage.set('');
    this.customNotifType.set('info');
    this.selectedTargetUser.set(null);
    this.showSendNotificationModal.set(true);

    if (this.adminUsersList().length === 0) {
      this.loadingUsers.set(true);
      this.userService.getAllUsers().subscribe({
        next: (users) => {
          const activeUsers = (users || [])
            .filter(u => u.status === 1)
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
          this.adminUsersList.set(activeUsers);
          this.loadingUsers.set(false);
        },
        error: (err) => {
          console.error('Error cargando usuarios para notificaciones:', err);
          this.loadingUsers.set(false);
        }
      });
    }
  }

  closeSendNotificationModal(): void {
    this.showSendNotificationModal.set(false);
  }

  sendCustomNotification(): void {
    const target = this.selectedTargetUser();
    if (!target || !target.id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Destinatario requerido',
        detail: 'Por favor selecciona el usuario destinatario.'
      });
      return;
    }

    const title = this.customNotifTitle().trim();
    if (!title) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Título requerido',
        detail: 'Por favor ingresa un título para la notificación.'
      });
      return;
    }

    const message = this.customNotifMessage().trim();
    if (!message) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Mensaje requerido',
        detail: 'Por favor escribe el mensaje a enviar.'
      });
      return;
    }

    this.sendingNotification.set(true);
    this.notificationService.sendCustomNotification(
      target.id,
      title,
      message,
      this.customNotifType()
    ).subscribe({
      next: () => {
        this.sendingNotification.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Notificación enviada',
          detail: `La notificación fue enviada exitosamente a ${target.name}.`
        });
        this.closeSendNotificationModal();
      },
      error: (err) => {
        this.sendingNotification.set(false);
        console.error('Error enviando notificación personalizada:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error al enviar',
          detail: err.error?.message || 'No se pudo enviar la notificación.'
        });
      }
    });
  }

  async requestNotificationPermission() {
    await this.notificationService.requestBrowserPermission();
  }

  logout() {
    this.authService.logout();
  }

  get userInitials(): string {
    const user = this.currentUser();
    if (!user || !user.name) return 'U';
    return user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }

  handleNotificationClick(notification: Notification) {

    this.markAsRead(notification);

    if (notification.title === 'Nueva Solicitud Asignada') {
      const match = notification.message.match(/Se te ha asignado la solicitud de producción: (.*)/);
      if (match && match[1]) {
        const requestName = match[1].trim();
        this.productionService.getProductionRequests().subscribe({
          next: (requests) => {
            const request = requests.find(r => r.name === requestName);
            if (request) {
              this.dialogService.open(ProductionDialogComponent, {
                header: 'Editar Solicitud',
                width: '70%',
                contentStyle: { overflow: 'auto' },
                baseZIndex: 10000,
                maximizable: true,
                breakpoints: {
                  '960px': '75vw',
                  '640px': '90vw'
                },
                data: { id: request.id, readonly: false }
              });
            }
          },
          error: (err) => console.error('Error fetching request on notification click', err)
        });
      }
    } else if (
      notification.title.includes('Tarea de Flujo') ||
      notification.title.includes('Solicitud Asignada a tu Equipo') ||
      notification.title.includes('Revisión Requerida') ||
      notification.title.includes('Cierre de Solicitud') ||
      notification.title.includes('Rechazada') ||
      notification.title.includes('Solicitud Bloqueada')
    ) {
      this.router.navigate(['/requests-beta/inbox']);
    }
  }

  markAsRead(notification: Notification) {
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id).subscribe();
    }
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead().subscribe();
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'success': return 'check-circle';
      case 'warning': return 'alert-triangle';
      case 'error': return 'x-circle';
      default: return 'info';
    }
  }

  initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      this.isDarkMode.set(true);
      document.querySelector('html')?.classList.add('my-app-dark');
    }
  }

  toggleDrawer() {
    this.isDrawerOpen = !this.isDrawerOpen;
  }

  openHealthModal() {
    this.showHealthModal.set(true);
  }

  onDrawerVisibleChange(isVisible: boolean) {
    this.isDrawerOpen = isVisible;
  }

  toggleTheme() {
    this.isDarkMode.update(v => !v);
    const element = document.querySelector('html');
    if (this.isDarkMode()) {
      element?.classList.add('my-app-dark');
      localStorage.setItem('theme', 'dark');
    } else {
      element?.classList.remove('my-app-dark');
      localStorage.setItem('theme', 'light');
    }
  }

  getIconName(iconKey: string | undefined): string {
    return iconKey || 'list';
  }

  hasPermission(item: MenuItem): boolean {

    if (item.permissionName) {
      return this.authService.hasPermission(item.permissionName);
    }

    return true;
  }

  onMenuClick(item: MenuItem) {
    if (item.children && item.children.length > 0) {
      this.toggleSubmenu(item.id);
      return;
    }

    if (item.route) {
      this.router.navigate([item.route]);
      this.isDrawerOpen = false;
    }
  }

  toggleSubmenu(id: number) {
    this.expandedItems.update(set => {
      const newSet = new Set(set);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }

  isExpanded(id: number): boolean {
    return this.expandedItems().has(id);
  }

  private fetchMenuItems() {
    this.loading.set(true);
    this.menuService.getAllMenuItems().subscribe({
      next: (response) => {
        if (response.success) {
          const allItems = response.data;

          const isFlatList = allItems.some(item => !!item.parentId);

          if (isFlatList) {

            const activeItems = allItems.filter(item => item.isActive !== false);

            const parents = activeItems.filter(item => !item.parentId);

            parents.forEach(parent => {

              parent.children = activeItems.filter(child => child.parentId == parent.id);

              parent.children.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
            });

            parents.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

            this.menuItems.set(parents);
          } else {

            let roots = allItems.filter(item => item.isActive !== false);

            roots.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

            const processChildren = (items: MenuItem[]) => {
              items.forEach(item => {
                if (item.children) {

                  item.children = item.children.filter(child => child.isActive !== false);

                  item.children.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

                  processChildren(item.children);
                }
              });
            };

            processChildren(roots);

            this.menuItems.set(roots);
          }
        } else {
          this.error.set(response.message || 'Error al cargar el menú');
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error fetching menu:', err);
        this.error.set('Error de conexión al cargar el menú');
        this.loading.set(false);
      }
    });
  }
}

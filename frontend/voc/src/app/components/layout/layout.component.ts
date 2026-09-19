import { LucideIconComponent } from '../lucide-icon/lucide-icon.component';
import { CachedImagePipe } from '../../pipes/cached-image.pipe';
import { CoreDialogService } from '../../services/core-dialog.service';
import { DialogService } from 'primeng/dynamicdialog';
import { Component, inject, signal, computed, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';

import { DrawerModule } from 'primeng/drawer';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { AvatarModule } from 'primeng/avatar';
import { StyleClassModule } from 'primeng/styleclass';
import { PopoverModule } from 'primeng/popover';
import { BadgeModule } from 'primeng/badge';
import { MenuModule } from 'primeng/menu';
import { MenuItem as PrimeMenuItem } from 'primeng/api';

import { AuthService } from '../../services/auth.service';
import { MenuService, MenuItem } from '../../services/menu.service';
import { NotificationService, Notification } from '../../services/notification.service';
;
import { ProductionService } from '../../services/production.service';
import { ProductionDialogComponent } from '../../pages/production_2/production-dialog/production-dialog.component';
import { SystemHealthModalComponent } from '../system-health-modal/system-health-modal.component';
import { PERMISSIONS } from '../../constants/permissions';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    LucideIconComponent,
    CachedImagePipe,
    CommonModule,
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
    SystemHealthModalComponent
  ],
  providers: [DialogService],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss'
})
export class LayoutComponent implements OnInit {
  private authService = inject(AuthService);
  private menuService = inject(MenuService);
  private notificationService = inject(NotificationService);
  private productionService = inject(ProductionService);
  private dialogService = inject(CoreDialogService);
  private router = inject(Router);

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

  expandedItems = signal<Set<number>>(new Set());

  isDrawerOpen = false;
  showHealthModal = signal(false);

  isDarkMode = signal(false);

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
    this.notificationService.loadNotifications();
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

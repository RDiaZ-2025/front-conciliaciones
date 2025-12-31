import { Component, inject, signal, computed, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';

// PrimeNG Imports
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

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
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
    MenuModule
  ],
  templateUrl: './layout.html',
  styleUrl: './layout.scss'
})
export class LayoutComponent implements OnInit {
  private authService = inject(AuthService);
  private menuService = inject(MenuService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  menuItems = signal<MenuItem[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  
  // Auth signals
  currentUser = this.authService.currentUser;
  
  // Notification signals
  notifications = this.notificationService.notifications;
  unreadCount = this.notificationService.unreadCount;

  // Expanded menu items state
  expandedItems = signal<Set<number>>(new Set());

  // Drawer state
  isDrawerOpen = false;

  isDarkMode = signal(false);

  userMenuItems: PrimeMenuItem[] = [
    { 
      label: 'Cerrar Sesión', 
      icon: 'pi pi-power-off', 
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
    // Always mark as read
    this.markAsRead(notification);

    // Handle navigation based on notification content
    if (notification.title === 'Nueva Solicitud Asignada') {
      const match = notification.message.match(/Se te ha asignado la solicitud de producción: (.*)/);
      if (match && match[1]) {
        const requestName = match[1].trim();
        this.router.navigate(['/production'], { 
          queryParams: { 
            action: 'open', 
            requestName: requestName 
          } 
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
      case 'success': return 'pi pi-check-circle text-green-500';
      case 'warning': return 'pi pi-exclamation-triangle text-yellow-500';
      case 'error': return 'pi pi-times-circle text-red-500';
      default: return 'pi pi-info-circle text-blue-500';
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
    if (!iconKey) return 'pi pi-list';
    // If the icon already starts with 'pi ', assume it's a full class
    if (iconKey.startsWith('pi ')) return iconKey;
    // Otherwise prepend 'pi ' (assuming the user entered e.g. 'pi-home' or 'home')
    // Matches the behavior in Menus page where it does 'pi ' + icon
    return `pi ${iconKey}`;
  }

  hasPermission(item: MenuItem): boolean {
    // If item has a specific permission name attached from backend
    if (item.permissionName) {
      return this.authService.hasPermission(item.permissionName);
    }

    // If no permission required/found, show it
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

          // Check if the response is a flat list (contains items with parentId)
          // If yes, we need to build the tree.
          // If no (only roots), we assume it's already a tree structure.
          const isFlatList = allItems.some(item => !!item.parentId);

          if (isFlatList) {
            // Logic for Flat List -> Tree
            const activeItems = allItems.filter(item => item.isActive !== false);

            // Find parents (roots)
            const parents = activeItems.filter(item => !item.parentId);

            // Attach children
            parents.forEach(parent => {
              // Loose equality to handle string/number mismatch
              parent.children = activeItems.filter(child => child.parentId == parent.id);
              // Sort children
              parent.children.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
            });

            // Sort parents
            parents.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

            this.menuItems.set(parents);
          } else {
            // Logic for Pre-built Tree (only roots at top level)
            // We assume the children are already nested in item.children

            // Filter active roots
            let roots = allItems.filter(item => item.isActive !== false);

            // Sort roots
            roots.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

            // Recursively sort and filter active children (optional but good practice)
            const processChildren = (items: MenuItem[]) => {
              items.forEach(item => {
                if (item.children) {
                  // Filter active children
                  item.children = item.children.filter(child => child.isActive !== false);
                  // Sort children
                  item.children.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
                  // Recurse
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

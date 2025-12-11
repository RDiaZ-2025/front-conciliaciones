import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';

// PrimeNG Imports
import { DrawerModule } from 'primeng/drawer';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { AvatarModule } from 'primeng/avatar';
import { StyleClassModule } from 'primeng/styleclass';

import { AuthService } from '../../services/auth';
import { MenuService, MenuItem } from '../../services/menu';
import { PERMISSIONS } from '../../constants/permissions';

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
    StyleClassModule
  ],
  templateUrl: './layout.html',
  styleUrl: './layout.scss'
})
export class LayoutComponent {
  private authService = inject(AuthService);
  private menuService = inject(MenuService);
  private router = inject(Router);

  menuItems = signal<MenuItem[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  // Drawer state
  isDrawerOpen = false;

  // Icon mapping for PrimeIcons
  private iconMap: Record<string, string> = {
    'HistoryIcon': 'pi pi-history',
    'UploadIcon': 'pi pi-cloud-upload',
    'DashboardIcon': 'pi pi-chart-bar',
    'PeopleIcon': 'pi pi-users',
    'AssignmentIcon': 'pi pi-list',
    'ImageIcon': 'pi pi-image',
    'MenuBookIcon': 'pi pi-book',
    'CloudUploadIcon': 'pi pi-cloud-upload',
    'AnalyticsIcon': 'pi pi-chart-line',
    'SupervisorAccountIcon': 'pi pi-users',
    'FactoryIcon': 'pi pi-building'
  };

  isDarkMode = signal(false);

  constructor() {
    this.fetchMenuItems();
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
    } else {
      element?.classList.remove('my-app-dark');
    }
  }

  logout() {
    this.authService.logout();
  }

  getIconName(iconKey: string | undefined): string {
    if (!iconKey) return 'pi pi-list';
    return this.iconMap[iconKey] || 'pi pi-list';
  }

  hasPermission(item: MenuItem): boolean {
    // If item has a specific permission name attached from backend
    if (item.permissionName) {
      return this.authService.hasPermission(item.permissionName);
    }

    // Fallback mapping based on labels (legacy support)
    const permissionMapByLabel: Record<string, string> = {
      'Historial Carga Archivos': PERMISSIONS.HISTORY_LOAD_COMMERCIAL_FILES,
      'Cargar Documentos': PERMISSIONS.DOCUMENT_UPLOAD,
      'Dashboard de Gestión': PERMISSIONS.MANAGEMENT_DASHBOARD,
      'Producción': PERMISSIONS.PRODUCTION_MANAGEMENT,
      'Usuarios': PERMISSIONS.ADMIN_PANEL,
      'Portada 15 Minutos': PERMISSIONS.PORTADA_15_MINUTOS,
      'Gestión de Menús': PERMISSIONS.MANAGE_MENUS
    };

    const permission = permissionMapByLabel[item.label];
    if (permission) {
      return this.authService.hasPermission(permission);
    }

    // If no permission required/found, show it
    return true;
  }

  onMenuClick(item: MenuItem) {
    if (item.route) {
      this.router.navigate([item.route]);
      this.isDrawerOpen = false;
    }
  }

  private fetchMenuItems() {
    this.loading.set(true);
    this.menuService.getAllMenuItems().subscribe({
      next: (response) => {
        if (response.success) {
          // Filter parent items
          const parents = response.data.filter(item => !item.parentId);

          // Attach children
          parents.forEach(parent => {
            parent.children = response.data.filter(child => child.parentId === parent.id);
          });

          this.menuItems.set(parents);
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

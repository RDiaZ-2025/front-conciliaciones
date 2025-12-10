import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';

import { AuthService } from '../../services/auth';
import { MenuService, MenuItem } from '../../services/menu';
import { PERMISSIONS } from '../../constants/permissions';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatExpansionModule
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
  isDrawerOpen = signal(false);

  // Icon mapping
  private iconMap: Record<string, string> = {
    'HistoryIcon': 'history',
    'UploadIcon': 'cloud_upload',
    'DashboardIcon': 'analytics',
    'PeopleIcon': 'supervisor_account',
    'AssignmentIcon': 'assignment',
    'ImageIcon': 'image',
    'MenuBookIcon': 'menu_book',
    'CloudUploadIcon': 'cloud_upload',
    'AnalyticsIcon': 'analytics',
    'SupervisorAccountIcon': 'supervisor_account',
    'FactoryIcon': 'factory'
  };

  constructor() {
    this.fetchMenuItems();
  }

  toggleDrawer() {
    this.isDrawerOpen.update(v => !v);
  }

  logout() {
    this.authService.logout();
  }

  getIconName(iconKey: string | undefined): string {
    if (!iconKey) return 'assignment';
    return this.iconMap[iconKey] || 'assignment';
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

    // If no permission required/found, show it (or hide it? default to show for now if public)
    // But usually in this app everything is protected. 
    // If no permission is mapped, we might assume it's public or we check if we should hide it.
    // Based on React code: if (!item.permission || hasPermission(item.permission))
    return true; 
  }

  onMenuClick(item: MenuItem) {
    if (item.route) {
        // Map backend routes to frontend routes if necessary, or assume they match
        // React app had a complex mapping in App.jsx `handleMenuSelect`
        // We should try to use the route from DB if it exists and matches Angular routes
        
        // Simplification: We will try to navigate to the route defined in DB
        // If the route is just a key like "dashboard", we need to map it.
        
        let route = item.route;
        if (!route) {
            // Try to map by label/ID if route is missing
             const menuLabelToViewMap: Record<string, string> = {
                'Historial Carga Archivos': '/history', // Adjust paths
                'Cargar Documentos': '/upload',
                'Dashboard de Gestión': '/dashboard',
                'Producción': '/production',
                'Portada 15 Minutos': '/portada15',
                'Gestión de Menús': '/menu-management',
                'Usuarios': '/admin'
             };
             route = menuLabelToViewMap[item.label];
        }

        if (route) {
            this.router.navigate([route]);
            this.isDrawerOpen.set(false);
        }
    }
  }

  private fetchMenuItems() {
    this.menuService.getAllMenuItems().subscribe({
      next: (response) => {
        if (response.success) {
           // Sort by display order
           const sortedItems = response.data.sort((a, b) => a.displayOrder - b.displayOrder);
           this.menuItems.set(sortedItems);
        } else {
           this.error.set(response.message || 'Error al cargar el menú');
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Error de conexión');
        this.loading.set(false);
      }
    });
  }
}

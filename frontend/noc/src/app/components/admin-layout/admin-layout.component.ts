import { CachedImagePipe } from '../../pipes/cached-image.pipe';
import { LucideIconComponent } from '../lucide-icon/lucide-icon.component';
import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

import { DrawerModule } from 'primeng/drawer';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { AvatarModule } from 'primeng/avatar';
import { StyleClassModule } from 'primeng/styleclass';
import { MenuModule } from 'primeng/menu';
import { MenuItem as PrimeMenuItem } from 'primeng/api';

import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { MenuService, MenuItem } from '../../services/menu.service';

import { SystemHealthModalComponent } from '../system-health-modal/system-health-modal.component';

@Component({
  selector: 'app-admin-layout',
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    DrawerModule,
    ToolbarModule,
    ButtonModule,
    RippleModule,
    AvatarModule,
    StyleClassModule,
    MenuModule,
    LucideIconComponent,
    CachedImagePipe,
    SystemHealthModalComponent
  ]
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  public authService = inject(AuthService);
  public themeService = inject(ThemeService);
  private menuService = inject(MenuService);
  private router = inject(Router);

  showHealthModal = signal(false);

  isDrawerOpen = false;

  modules = signal<MenuItem[]>([]);

  openMenus: { [key: string]: boolean } = {};

  userMenuItems: PrimeMenuItem[] = [
    {
      label: 'Cerrar Sesión',
      icon: 'log-out',
      command: () => this.logout()
    }
  ];

  ngOnInit() {
    this.menuService.getAllMenuItems('noc').subscribe(response => {
      if (response.success) {
        const allItems = response.data;
        const isFlatList = allItems.some(item => !!item.parentId);

        let rawModules: MenuItem[] = [];
        if (isFlatList) {
          const activeItems = allItems.filter(item => item.isActive !== false);
          const parents = activeItems.filter(item => !item.parentId);
          parents.forEach(parent => {
            parent.children = activeItems.filter(child => child.parentId == parent.id);
            parent.children.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
          });
          parents.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
          rawModules = parents;
        } else {
          rawModules = allItems;
        }

        const filtered = rawModules
          .filter(module => module.isActive !== false)
          .map(module => {
            const visibleChildren = (module.children || []).filter(sub => {
              if (sub.isActive === false) return false;
              if (sub.permissionName) {
                return this.authService.hasPermission(sub.permissionName);
              }
              return true;
            });
            return {
              ...module,
              children: visibleChildren
            };
          })
          .filter(module => (module.children && module.children.length > 0) || module.route);

        this.modules.set(filtered);
      }
    });
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

  toggleMenu(moduleName: string) {
    this.openMenus[moduleName] = !this.openMenus[moduleName];
  }

  isMenuOpen(moduleName: string): boolean {
    return !!this.openMenus[moduleName];
  }

  get userInitials(): string {
    const name = this.authService.getUserName();
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }

  isEmoji(icon: string | undefined): boolean {
    if (!icon) return false;
    return icon.length <= 2;
  }

  getAbsoluteRoute(route: string | undefined): string {
    if (!route) return '';
    return route.startsWith('/') ? route : '/' + route;
  }

  ngOnDestroy() {
    const overlays = document.querySelectorAll('.p-drawer-mask, .p-component-overlay');
    overlays.forEach(overlay => overlay.remove());
    document.body.classList.remove('p-overflow-hidden');
    document.body.style.overflow = '';
  }

  logout() {
    this.authService.logout();
  }
}

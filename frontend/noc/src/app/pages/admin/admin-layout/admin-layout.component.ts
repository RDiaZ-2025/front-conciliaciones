import { CachedImagePipe } from '../../../pipes/cached-image.pipe';
import { LucideIconComponent } from '../../../components/lucide-icon/lucide-icon.component';
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

// PrimeNG Imports
import { DrawerModule } from 'primeng/drawer';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { AvatarModule } from 'primeng/avatar';
import { StyleClassModule } from 'primeng/styleclass';
import { MenuModule } from 'primeng/menu';
import { MenuItem as PrimeMenuItem } from 'primeng/api';

import { AuthService } from '../../../services/auth.service';
import { ThemeService } from '../../../services/theme.service';
import { MenuService, MenuItem } from '../../../services/menu.service';

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
    CachedImagePipe
  ]
})
export class AdminLayoutComponent implements OnInit {
  public authService = inject(AuthService);
  public themeService = inject(ThemeService);
  private menuService = inject(MenuService);
  private router = inject(Router);

  // Drawer state
  isDrawerOpen = false;

  // Lista de módulos del sistema para generar el menú dinámicamente
  modules: MenuItem[] = [];

  // Estado de los menús desplegables (qué modulo está abierto)
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

        if (isFlatList) {
          const activeItems = allItems.filter(item => item.isActive !== false);
          const parents = activeItems.filter(item => !item.parentId);
          parents.forEach(parent => {
            parent.children = activeItems.filter(child => child.parentId == parent.id);
            parent.children.sort((a, b) => a.displayOrder - b.displayOrder);
          });
          this.modules = parents;
        } else {
          this.modules = allItems;
        }
      }
    });
  }

  toggleDrawer() {
    this.isDrawerOpen = !this.isDrawerOpen;
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

  hasPermission(item: MenuItem): boolean {
    if (item.permissionName) {
      return this.authService.hasPermission(item.permissionName);
    }
    return true;
  }

  hasVisibleSubmodules(module: MenuItem): boolean {
    if (!module.children || module.children.length === 0) {
      return false;
    }
    return module.children.some(sub => {
      if (sub.isActive === false) return false;
      return this.hasPermission(sub);
    });
  }

  isEmoji(icon: string | undefined): boolean {
    if (!icon) return false;
    return icon.length <= 2;
  }

  logout() {
    this.authService.logout();
  }
}
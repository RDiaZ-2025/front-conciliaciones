import { LucideIconComponent } from '../../../components/lucide-icon/lucide-icon.component';
import { Component, signal, inject, OnInit } from '@angular/core';
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
import { UserService } from '../../../services/user.service';

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
    LucideIconComponent
  ]
})
export class AdminLayoutComponent implements OnInit {
  public authService = inject(AuthService);
  public themeService = inject(ThemeService);
  private userService = inject(UserService);
  private router = inject(Router);

  // Drawer state
  isDrawerOpen = false;

  // Lista de módulos del sistema para generar el menú dinámicamente
  modules: any[] = [];

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
    this.userService.getSystemModules().subscribe(modules => {
      this.modules = modules;
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

  hasVisibleSubmodules(module: any): boolean {
    if (module.adminOnly && !this.authService.isAdmin()) {
      return false; 
    }
    return module.submodules.some((sub: any) => {
      if (sub.is_disabled) return false;
      return this.authService.hasPermission(sub.code);
    });
  }

  showMaintenanceAlert(msg: string) {
    alert(msg || 'Este módulo se encuentra en mantenimiento. Por favor, intente más tarde.');
  }

  logout() {
    this.authService.logout();
  }
}
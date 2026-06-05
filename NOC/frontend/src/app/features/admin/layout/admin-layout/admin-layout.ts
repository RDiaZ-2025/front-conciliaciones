import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SYSTEM_MODULES } from '../../../../core/config/modules.config';
import { AuthService } from '../../../../core/services/auth.service';
import { ThemeService } from '../../../../core/services/theme.service';

import { UserService } from '../../../../core/services/user.service';

@Component({
  selector: 'app-admin-layout',
  templateUrl: './admin-layout.html',
  styleUrls: ['./admin-layout.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class AdminLayoutComponent {
  public authService = inject(AuthService);
  public themeService = inject(ThemeService);
  private userService = inject(UserService);

  // Signal para controlar si el sidebar está visible
  isSidebarOpen = signal(this.getInitialSidebarState());

  // Lista de módulos del sistema para generar el menú dinámicamente
  modules: any[] = [];

  // Estado de los menús desplegables (qué modulo está abierto)
  openMenus: { [key: string]: boolean } = {};

  ngOnInit() {
    this.userService.getSystemModules().subscribe(modules => {
      this.modules = modules;
    });
  }

  private getInitialSidebarState(): boolean {
    const saved = localStorage.getItem('sidebar_open');
    return saved !== null ? saved === 'true' : true;
  }

  toggleSidebar() {
    this.isSidebarOpen.update(value => {
      const newState = !value;
      localStorage.setItem('sidebar_open', String(newState));
      return newState;
    });
  }

  toggleMenu(moduleName: string) {
    this.openMenus[moduleName] = !this.openMenus[moduleName];
  }

  isMenuOpen(moduleName: string): boolean {
    return !!this.openMenus[moduleName];
  }

  // NUEVO: Verificar si el módulo tiene al menos un submódulo permitido y visible
  hasVisibleSubmodules(module: any): boolean {
    if (module.adminOnly && !this.authService.isAdmin()) {
      return false; // Se oculta completamente
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
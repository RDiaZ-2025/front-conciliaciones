import { Component, signal } from '@angular/core'; // 👈 Importamos signal
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-layout.html',
  styleUrls: ['./admin-layout.scss']
})
export class AdminLayoutComponent {
  // Signal para controlar si el sidebar está visible en móviles
  isSidebarOpen = signal(false);

  // Signal para controlar el sub-menú de Administración
  isAdminMenuOpen = signal(false);

  constructor(public authService: AuthService) { }

  toggleSidebar() {
    this.isSidebarOpen.update(value => !value);
  }

  toggleAdminMenu() {
    this.isAdminMenuOpen.update(value => !value);
  }

  logout() {
    this.authService.logout();
  }
}
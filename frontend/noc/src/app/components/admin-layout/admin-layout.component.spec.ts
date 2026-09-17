import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-layout.component.spec.ts.component.html',
  styleUrls: ['./admin-layout.component.spec.ts.component.scss']
})
export class AdminLayoutComponent {

  isSidebarOpen = signal(false);

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

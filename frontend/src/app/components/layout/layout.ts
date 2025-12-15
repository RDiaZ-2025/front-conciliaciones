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

import { AuthService } from '../../services/auth.service';
import { MenuService, MenuItem } from '../../services/menu.service';

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

  // Expanded menu items state
  expandedItems = signal<Set<number>>(new Set());

  // Drawer state
  isDrawerOpen = false;

  isDarkMode = signal(false);

  constructor() {
    this.fetchMenuItems();
    this.initTheme();
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

  logout() {
    this.authService.logout();
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

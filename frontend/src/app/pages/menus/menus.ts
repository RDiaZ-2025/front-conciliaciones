import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TreeTableModule } from 'primeng/treetable';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService, TreeNode } from 'primeng/api';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { SessionInfoComponent } from '../../components/shared/session-info/session-info';
import { MenuDialogComponent } from './menu-dialog/menu-dialog';
import { MenusService } from './menus.service';
import { MenuItem, MenuFormData } from './menus.models';

@Component({
  selector: 'app-menus',
  standalone: true,
  imports: [
    CommonModule,
    TreeTableModule,
    ButtonModule,
    ToastModule,
    PageHeaderComponent,
    SessionInfoComponent,
    MenuDialogComponent
  ],
  providers: [MessageService],
  templateUrl: './menus.html',
  styleUrl: './menus.scss'
})
export class MenusComponent implements OnInit {
  private menuService = inject(MenusService);
  private messageService = inject(MessageService);

  menuItems = signal<TreeNode[]>([]);
  rawMenuItems = signal<MenuItem[]>([]);
  loading = signal<boolean>(false);
  dialogVisible = signal<boolean>(false);
  saving = signal<boolean>(false);
  editingItem = signal<MenuItem | null>(null);

  parentOptions = signal<{ label: string, value: number | null }[]>([]);

  ngOnInit() {
    this.loadMenuItems();
  }

  loadMenuItems() {
    this.loading.set(true);
    this.menuService.getMenuItems().subscribe({
      next: (response) => {
        this.rawMenuItems.set(response.data);
        this.menuItems.set(this.buildTree(response.data));
        this.updateParentOptions(response.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al cargar menú' });
        this.loading.set(false);
      }
    });
  }

  buildTree(items: MenuItem[]): TreeNode[] {
    return items.map(item => ({
      data: item,
      children: item.children ? this.buildTree(item.children) : [],
      expanded: true
    }));
  }

  updateParentOptions(items: MenuItem[]) {
    const options: { label: string, value: number | null }[] = [
      { label: 'Ninguno (Raíz)', value: null }
    ];

    // Only show items that are roots (no parentId)
    // If items is a tree (roots only), we just iterate them.
    // If items is flat, we filter.
    // Based on buildTree, items seems to be roots with children nested.
    // Let's assume items passed here are the roots.

    items.forEach(item => {
      // If it's a root (no parentId check might be needed if flat list is passed, 
      // but buildTree suggests items are structured. 
      // However, loadMenuItems calls updateParentOptions(response.data).
      // If response.data is flat, we need to filter.
      // If response.data is tree, it only contains roots.

      // Safer to check parentId if available, or just take all items if they are roots.
      // Let's filter for safety if it's a flat list mixed with children.
      if (!item.parentId) {
        options.push({ label: item.label, value: item.id });
      }
    });

    this.parentOptions.set(options);
  }

  openNew() {
    this.editingItem.set(null);
    this.dialogVisible.set(true);
  }

  editItem(item: MenuItem) {
    this.editingItem.set(item);
    this.dialogVisible.set(true);
  }

  deleteItem(item: MenuItem) {
    if (!confirm('¿Está seguro de eliminar este ítem de menú?')) return;

    this.loading.set(true);
    this.menuService.deleteMenuItem(item.id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Ítem eliminado' });
        this.loadMenuItems();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al eliminar ítem' });
        this.loading.set(false);
      }
    });
  }

  saveItem(data: MenuFormData) {
    this.saving.set(true);

    const request = this.editingItem()
      ? this.menuService.updateMenuItem(this.editingItem()!.id, data)
      : this.menuService.createMenuItem(data);

    request.subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Guardado correctamente' });
        this.dialogVisible.set(false);
        this.loadMenuItems();
        this.saving.set(false);
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al guardar' });
        this.saving.set(false);
      }
    });
  }
}

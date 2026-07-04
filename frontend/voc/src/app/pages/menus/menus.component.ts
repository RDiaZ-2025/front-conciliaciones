import { LucideIconComponent } from '../../components/lucide-icon/lucide-icon.component';
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TreeTableModule } from 'primeng/treetable';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { SelectModule } from 'primeng/select';
import { MessageService, TreeNode } from 'primeng/api';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { MenuDialogComponent } from './menu-dialog/menu-dialog.component';
import { MenusService } from './menus.service';
import { PermissionService, Permission } from '../../services/permission.service';
import { MenuItem } from '../../models/common/menu-item';
import { MenuFormData } from '../../models/common/menu-form-data';

@Component({
  selector: 'app-menus',
  standalone: true,
  imports: [
    LucideIconComponent,
    CommonModule,
    FormsModule,
    TreeTableModule,
    ButtonModule,
    ToastModule,
    SelectModule,
    PageHeaderComponent,
    MenuDialogComponent
  ],
  providers: [MessageService],
  templateUrl: './menus.component.html',
  styleUrl: './menus.component.scss'
})
export class MenusComponent implements OnInit {
  private menuService = inject(MenusService);
  private permissionService = inject(PermissionService);
  private messageService = inject(MessageService);

  menuItems = signal<TreeNode[]>([]);
  rawMenuItems = signal<MenuItem[]>([]);
  permissions = signal<Permission[]>([]);
  loading = signal<boolean>(false);
  dialogVisible = signal<boolean>(false);
  saving = signal<boolean>(false);
  editingItem = signal<MenuItem | null>(null);

  selectedProject = signal<string>('voc');
  projectOptions = [
    { label: 'Portal VOC', value: 'voc' },
    { label: 'Portal NOC', value: 'noc' }
  ];

  parentOptions = signal<{ label: string, value: number | null }[]>([]);
  permissionOptions = signal<{ label: string, value: number }[]>([]);

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);

    // Load permissions first, then menus
    this.permissionService.getAllPermissions().subscribe({
      next: (response) => {
        if (response.success) {
          this.permissions.set(response.data);
          this.updatePermissionOptions(response.data);
        }
        this.loadMenuItems();
      },
      error: (err) => {
        console.error('Error loading permissions:', err);
        // Still try to load menus even if permissions fail
        this.loadMenuItems();
      }
    });
  }

  loadMenuItems() {
    this.loading.set(true);
    this.menuService.getMenuItems(this.selectedProject()).subscribe({
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

  onProjectChange(newProject: string) {
    this.selectedProject.set(newProject);
    this.loadMenuItems();
  }

  updatePermissionOptions(permissions: Permission[]) {
    const options = permissions.map(p => ({
      label: p.name,
      value: p.id
    }));
    this.permissionOptions.set(options);
  }

  getPermissionName(id?: number): string {
    if (!id) return '-';
    const permission = this.permissions().find(p => p.id === id);
    return permission ? permission.name : 'ID: ' + id;
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
      { label: 'Ninguno (Raíz)', value: 0 }
    ];

    items.forEach(item => {
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
    
    // Set project value from the current selector state
    data.project = this.selectedProject();

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

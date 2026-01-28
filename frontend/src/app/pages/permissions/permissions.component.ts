
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { PermissionDialogComponent } from './permission-dialog/permission-dialog.component';
import { PermissionService } from '../../services/permission.service';
import { Permission, PermissionFormData } from './permissions.models';

@Component({
  selector: 'app-permissions',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    ToastModule,
    ToolbarModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    ConfirmDialogModule,
    PageHeaderComponent,
    PermissionDialogComponent
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './permissions.component.html',
  styleUrl: './permissions.component.scss'
})
export class PermissionsComponent implements OnInit {
  private permissionService = inject(PermissionService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  permissions = signal<Permission[]>([]);
  loading = signal<boolean>(false);
  dialogVisible = signal<boolean>(false);
  saving = signal<boolean>(false);
  editingPermission = signal<Permission | null>(null);

  ngOnInit() {
    this.loadPermissions();
  }

  loadPermissions() {
    this.loading.set(true);
    this.permissionService.getAllPermissions().subscribe({
      next: (response) => {
        if (response.success) {
          // Map the service response to the local model if needed
          // The service returns data: Permission[] (from service interface)
          // We cast or map it.
          this.permissions.set(response.data as unknown as Permission[]);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al cargar permisos' });
        this.loading.set(false);
      }
    });
  }

  openNew() {
    this.editingPermission.set(null);
    this.dialogVisible.set(true);
  }

  editPermission(permission: Permission) {
    this.editingPermission.set(permission);
    this.dialogVisible.set(true);
  }

  deletePermission(permission: Permission) {
    this.confirmationService.confirm({
      message: '¿Está seguro de eliminar este permiso?',
      header: 'Confirmar',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loading.set(true);
        this.permissionService.deletePermission(permission.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Permiso eliminado' });
            this.loadPermissions();
          },
          error: (err) => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al eliminar permiso' });
            this.loading.set(false);
          }
        });
      }
    });
  }

  savePermission(data: PermissionFormData) {
    this.saving.set(true);

    // Convert PermissionFormData to Partial<Permission> (from service interface)
    // We need to cast or ensure compatibility
    const permissionData = {
      name: data.name,
      description: data.description || undefined
    };

    const request = this.editingPermission()
      ? this.permissionService.updatePermission(this.editingPermission()!.id, permissionData)
      : this.permissionService.createPermission(permissionData);

    request.subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Guardado correctamente' });
        this.dialogVisible.set(false);
        this.loadPermissions();
        this.saving.set(false);
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al guardar' });
        this.saving.set(false);
      }
    });
  }

  onGlobalFilter(table: Table, event: Event) {
    table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
  }
}

import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

// PrimeNG Imports
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToolbarModule } from 'primeng/toolbar';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';

import { AuthService } from '../../services/auth';
import { UserService, User, CreateUserDto, UpdateUserDto } from '../../services/user';
import { PERMISSIONS, PERMISSION_LABELS, PERMISSION_COLORS } from '../../constants/permissions';
import { UserDialogComponent } from './components/user-dialog/user-dialog';
import { HistoryDialogComponent } from './components/history-dialog/history-dialog';
import { AccessHistoryRecord } from '../../services/user';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { SessionInfoComponent } from '../../components/shared/session-info/session-info';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    ToolbarModule,
    CardModule,
    ToastModule,
    ConfirmDialogModule,
    TagModule,
    IconFieldModule,
    InputIconModule,
    TooltipModule,
    PageHeaderComponent,
    SessionInfoComponent
  ],
  providers: [DialogService, MessageService, ConfirmationService],
  templateUrl: './admin.html',
  styleUrl: './admin.scss'
})
export class AdminComponent implements OnInit {
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private dialogService = inject(DialogService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  currentUser = this.authService.currentUser;
  loading = signal(false);

  users: User[] = [];
  searchControl = new FormControl('');

  @ViewChild('dt') dt!: Table;

  ref: DynamicDialogRef | undefined | null;

  ngOnInit() {
    this.loadUsers();
    this.setupSearch();
  }

  loadUsers() {
    this.loading.set(true);
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading users:', err);
        this.showToast('error', 'Error', 'Error al cargar usuarios');
        this.loading.set(false);
      }
    });
  }

  setupSearch() {
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(value => {
      if (this.dt) {
        this.dt.filterGlobal(value, 'contains');
      }
    });
  }

  openUserDialog(user?: User) {
    this.ref = this.dialogService.open(UserDialogComponent, {
      header: user ? 'Editar Usuario' : 'Nuevo Usuario',
      width: '500px',
      contentStyle: { overflow: 'auto' },
      baseZIndex: 10000,
      maximizable: true,
      data: {
        user: user,
        isEdit: !!user
      }
    });

    if (this.ref) {
      this.ref.onClose.subscribe((result) => {
        if (result) {
          if (user) {
            this.updateUser(user.id, result);
          } else {
            this.createUser(result);
          }
        }
      });
    }
  }

  createUser(data: CreateUserDto) {
    this.loading.set(true);
    this.userService.createUser(data).subscribe({
      next: () => {
        this.showToast('success', 'Éxito', 'Usuario creado exitosamente');
        this.loadUsers();
      },
      error: (err) => {
        console.error('Error creating user:', err);
        this.showToast('error', 'Error', err.error?.message || 'Error al crear usuario');
        this.loading.set(false);
      }
    });
  }

  updateUser(id: number, data: UpdateUserDto) {
    this.loading.set(true);
    this.userService.updateUser(id, data).subscribe({
      next: () => {
        this.showToast('success', 'Éxito', 'Usuario actualizado exitosamente');
        this.loadUsers();
      },
      error: (err) => {
        console.error('Error updating user:', err);
        this.showToast('error', 'Error', err.error?.message || 'Error al actualizar usuario');
        this.loading.set(false);
      }
    });
  }

  toggleUserStatus(user: User) {
    if (user.email === this.currentUser()?.email) {
      this.showToast('error', 'Error', 'No puedes deshabilitar tu propia cuenta');
      return;
    }

    const action = user.status === 1 ? 'deshabilitar' : 'habilitar';

    this.confirmationService.confirm({
      message: `¿Estás seguro de que quieres ${action} a ${user.name}?`,
      header: 'Confirmación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      accept: () => {
        this.loading.set(true);
        this.userService.toggleUserStatus(user.id).subscribe({
          next: (response) => {
            const statusMsg = response.newStatus === 1 ? 'habilitado' : 'deshabilitado';
            this.showToast('success', 'Éxito', `Usuario ${statusMsg} exitosamente`);
            this.loadUsers();
          },
          error: (err) => {
            console.error('Error toggling status:', err);
            this.showToast('error', 'Error', err.error?.message || 'Error al cambiar estado');
            this.loading.set(false);
          }
        });
      }
    });
  }

  viewHistory(user: User) {
    const history = this.loadAccessHistory(user.email);

    this.dialogService.open(HistoryDialogComponent, {
      header: `Historial de Acceso: ${user.name}`,
      width: '600px',
      contentStyle: { overflow: 'auto' },
      baseZIndex: 10000,
      data: { history }
    });
  }

  private loadAccessHistory(email: string): AccessHistoryRecord[] {
    try {
      const backendHistory = JSON.parse(localStorage.getItem('user_access_history') || '{}');
      const frontendHistory = JSON.parse(localStorage.getItem('frontend_login_history') || '[]');

      const combinedHistory: AccessHistoryRecord[] = [];

      // Get backend history for this user
      if (backendHistory[email]) {
        backendHistory[email].forEach((record: any) => {
          combinedHistory.push({
            ...record,
            source: 'backend'
          });
        });
      }

      // Get frontend history for this user
      frontendHistory.forEach((record: any) => {
        if (record.email === email) {
          combinedHistory.push({
            ...record,
            source: 'frontend'
          });
        }
      });

      // Sort by date descending
      return combinedHistory.sort((a, b) => new Date(b.loginTime).getTime() - new Date(a.loginTime).getTime());
    } catch (error) {
      console.error('Error loading access history:', error);
      this.showToast('error', 'Error', 'Error al cargar historial');
      return [];
    }
  }

  getPermissionLabel(perm: string): string {
    return PERMISSION_LABELS[perm as keyof typeof PERMISSION_LABELS] || perm;
  }

  getPermissionSeverity(perm: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | undefined {
    const color = PERMISSION_COLORS[perm as keyof typeof PERMISSION_COLORS];

    // Map colors to PrimeNG Tag severities
    const severityMap: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'> = {
      'primary': 'info',
      'accent': 'secondary',
      'warn': 'warn',
      'error': 'danger',
      'success': 'success',
      'info': 'info',
      'secondary': 'secondary'
    };

    return severityMap[color] || 'info';
  }

  private showToast(severity: 'success' | 'error' | 'info', summary: string, detail: string) {
    this.messageService.add({ severity, summary, detail });
  }
}

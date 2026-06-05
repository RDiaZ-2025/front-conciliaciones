import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User } from '../../../../core/models/user.model';
import { UserService } from '../../../../core/services/user.service';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './roles.html', // Asegúrate que coincida con tu archivo real
  styleUrls: ['./roles.scss']
})
export class RolesComponent {

  // --- VARIABLES DE ESTADO ---
  isPanelOpen = false;
  isEditing = false;

  users: User[] = []; // Lista de usuarios de la tabla

  // Objeto para guardar los datos del formulario
  selectedUser: User = {
    username: '',
    fullName: '',
    email: '',
    role: 'user',
    enabled: true,
    modules: [],
    password: ''
  };

  // Estructura de módulos dinámicos desde el backend
  systemModules: any[] = [];

  constructor(
    private userService: UserService,
    private cdr: ChangeDetectorRef // Inyectamos ChangeDetectorRef
  ) { }

  // 1. Al iniciar, cargamos los usuarios y los módulos disponibles
  ngOnInit() {
    this.loadUsers();
    this.loadModules();
  }

  // 2. Función reutilizable para pedir la lista al backend
  loadUsers() {
    this.userService.getUsers().subscribe({
      next: (data) => {
        this.users = data;
        console.log('Usuarios cargados:', this.users);
        this.cdr.detectChanges(); // Forzamos la detección de cambios
      },
      error: (err) => {
        console.error('Error cargando usuarios:', err);
      }
    });
  }

  loadModules(forceRefresh = false) {
    this.userService.getSystemModules(forceRefresh).subscribe({
      next: (data) => {
        this.systemModules = data;
        console.log('Módulos dinámicos cargados:', this.systemModules);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando módulos del sistema:', err);
      }
    });
  }

  openPanel() {
    this.isPanelOpen = true;
    this.isEditing = false;
    this.selectedUser = {
      username: '',
      fullName: '',
      email: '',
      role: 'user',
      enabled: true,
      modules: [],
      password: ''
    };
  }

  closePanel() {
    this.isPanelOpen = false;
  }

  // Al hacer clic en el lápiz, llenamos el formulario con esos datos
  editUser(user: User) {
    this.isPanelOpen = true;
    this.isEditing = true;
    // Copiamos el usuario para no modificar la tabla directamente hasta guardar
    this.selectedUser = { ...user };
  }

  deleteUser(user: User) {
    if (user.id) {
      // Confirmación simple antes de borrar (opcional)
      if (confirm('¿Estás seguro de borrar a ' + user.fullName + '?')) {
        this.userService.deleteUser(user.id).subscribe(() => {
          this.users = this.users.filter(u => u.id !== user.id);
          console.log('Usuario eliminado');
          this.cdr.detectChanges();
        });
      }
    }
  }

  saveUser() {
    // Validación simple: si no hay nombre o email, no hacemos nada
    if (!this.selectedUser.fullName || !this.selectedUser.email) {
      alert('Por favor completa el nombre y el correo');
      return;
    }

    const request$ = this.selectedUser.id
      ? this.userService.updateUser(this.selectedUser)
      : this.userService.createUser(this.selectedUser);

    request$.subscribe({
      next: () => {
        console.log(this.selectedUser.id ? 'Usuario actualizado' : 'Usuario creado');
        this.closePanel();
        this.loadUsers(); // Recargamos la lista
      },
      error: (err) => {
        console.error('Error al guardar usuario:', err);
        alert('Ocurrió un error al guardar el usuario. Verifica los datos.');
      }
    });
  }

  toggleModule(mod: string) {
    if (this.selectedUser.modules.includes(mod)) {
      this.selectedUser.modules = this.selectedUser.modules.filter(m => m !== mod);
    } else {
      this.selectedUser.modules.push(mod);
    }

    // Si desactiva todos los módulos, ponemos el usuario como inactivo automáticamente
    if (this.selectedUser.modules.length === 0) {
      this.selectedUser.enabled = false;
    }
  }

  isModuleGroupChecked(mod: any): boolean {
    if (!mod.submodules || mod.submodules.length === 0) return false;
    // Retorna true si TODOS los submódulos de este grupo están en selectedUser.modules
    return mod.submodules.every((sub: any) => this.selectedUser.modules.includes(sub.code));
  }

  toggleModuleGroup(mod: any, event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    
    mod.submodules.forEach((sub: any) => {
      const hasModule = this.selectedUser.modules.includes(sub.code);
      if (isChecked && !hasModule) {
        this.selectedUser.modules.push(sub.code);
      } else if (!isChecked && hasModule) {
        this.selectedUser.modules = this.selectedUser.modules.filter(m => m !== sub.code);
      }
    });

    if (this.selectedUser.modules.length === 0) {
      this.selectedUser.enabled = false;
    }
  }

  // --- GESTIÓN DE MÓDULOS ---
  activeTab: 'usuarios' | 'modulos' = 'usuarios';

  setTab(tab: 'usuarios' | 'modulos') {
    this.activeTab = tab;
    if (tab === 'modulos') {
      this.loadModules(true); // Forzar recarga para traer el estado fresco
    }
  }

  updateSubmoduleState(sub: any) {
    const payload = {
      is_under_maintenance: sub.is_under_maintenance,
      maintenance_message: sub.maintenance_message,
      is_disabled: sub.is_disabled
    };
    this.userService.updateModuleState(sub.code, payload).subscribe({
      next: () => {
        console.log(`Estado de ${sub.code} actualizado`);
      },
      error: (err) => {
        console.error('Error actualizando estado del módulo', err);
        alert('Hubo un error al actualizar el estado del módulo.');
      }
    });
  }
}
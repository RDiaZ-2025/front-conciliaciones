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

  // Estructura de módulos reales del sistema
  systemModules = [
    {
      name: 'Administración',
      submodules: [
        { code: 'roles', label: 'Asignación de Roles' },
        { code: 'dashboard', label: 'Dashboard' }
      ]
    }
  ];

  constructor(
    private userService: UserService,
    private cdr: ChangeDetectorRef // Inyectamos ChangeDetectorRef
  ) { }

  // 1. Al iniciar, cargamos los usuarios
  ngOnInit() {
    this.loadUsers();
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
  }
}
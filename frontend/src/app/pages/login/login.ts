import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { FloatLabelModule } from 'primeng/floatlabel';

import { AuthService } from '../../services/auth';
import { PERMISSIONS } from '../../constants/permissions';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    ToastModule,
    IconFieldModule,
    InputIconModule,
    FloatLabelModule
  ],
  providers: [MessageService],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private messageService = inject(MessageService);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  loading = signal(false);

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'Por favor, complete todos los campos requeridos.' });
      return;
    }

    this.loading.set(true);

    const { email, password } = this.loginForm.value;

    this.authService.login({ email: email!, password: password! }).subscribe({
      next: (response) => {
        if (response.success) {
           this.messageService.add({ severity: 'success', summary: 'Bienvenido', detail: 'Inicio de sesión exitoso' });
           // Small delay to show the toast
           setTimeout(() => {
             this.navigateBasedOnPermissions();
           }, 500);
        } else {
           this.messageService.add({ severity: 'error', summary: 'Error', detail: response.message || 'Error al iniciar sesión' });
           this.loading.set(false);
        }
      },
      error: (err) => {
        this.loading.set(false);
        const errorMessage = err.error?.message || err.message || 'Error de conexión';
        
        if (errorMessage.toLowerCase().includes('deshabilitado') || 
            errorMessage.toLowerCase().includes('sin permisos') || 
            errorMessage.toLowerCase().includes('disabled')) {
          this.messageService.add({ severity: 'error', summary: 'Acceso Denegado', detail: 'Usuario deshabilitado o sin permisos. Contacte al administrador.' });
        } else {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: errorMessage });
        }
      }
    });
  }

  private navigateBasedOnPermissions() {
    if (this.authService.hasPermission(PERMISSIONS.ADMIN_PANEL)) {
      this.router.navigate(['/admin']);
    } else if (this.authService.hasPermission(PERMISSIONS.PRODUCTION_MANAGEMENT)) {
      this.router.navigate(['/production']);
    } else if (this.authService.hasPermission(PERMISSIONS.DOCUMENT_UPLOAD)) {
      this.router.navigate(['/upload']);
    } else if (this.authService.hasPermission(PERMISSIONS.MANAGEMENT_DASHBOARD)) {
      this.router.navigate(['/dashboard']);
    } else {
      // Default fallback if authenticated but no specific landing page
      this.router.navigate(['/upload']); 
    }
  }
}

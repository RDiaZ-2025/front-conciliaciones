import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AuthService } from '../../services/auth';
import { PERMISSIONS } from '../../constants/permissions';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  hidePassword = signal(true);
  loading = signal(false);
  error = signal<string | null>(null);

  togglePasswordVisibility(event: MouseEvent) {
    event.preventDefault();
    this.hidePassword.update(value => !value);
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const { email, password } = this.loginForm.value;

    this.authService.login({ email: email!, password: password! }).subscribe({
      next: (response) => {
        if (response.success) {
           this.navigateBasedOnPermissions();
        } else {
           this.error.set(response.message || 'Error al iniciar sesión');
           this.loading.set(false);
        }
      },
      error: (err) => {
        this.loading.set(false);
        const errorMessage = err.error?.message || err.message || 'Error de conexión';
        
        if (errorMessage.toLowerCase().includes('deshabilitado') || 
            errorMessage.toLowerCase().includes('sin permisos') || 
            errorMessage.toLowerCase().includes('disabled')) {
          this.error.set('Usuario deshabilitado o sin permisos. Por favor, contacte al administrador.');
        } else {
          this.error.set(errorMessage);
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

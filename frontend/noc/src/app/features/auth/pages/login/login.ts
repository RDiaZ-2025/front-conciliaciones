import { Component, inject, ChangeDetectorRef, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ThemeService } from '../../../../core/services/theme.service';
import { CommonModule } from '@angular/common';

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

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule, 
    CommonModule,
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
  styleUrls: ['./login.scss']
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  public themeService = inject(ThemeService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private messageService = inject(MessageService);

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  isLoading = false;

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      const { email, password } = this.loginForm.value;

      this.authService.login({ email, password }).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Bienvenido', detail: 'Inicio de sesión exitoso' });
          setTimeout(() => {
            this.redirectToFirstAvailableModule();
          }, 500);
        },
        error: (err) => {
          this.isLoading = false;
          let errorMsg = 'Usuario o contraseña incorrectos';

          if (err.error && err.error.detail) {
            errorMsg = err.error.detail;
          } else if (err.error && err.error.message) {
            errorMsg = err.error.message;
          }

          this.messageService.add({ severity: 'error', summary: 'Error', detail: errorMsg });
          console.error(err);
          this.cdr.detectChanges(); 
        }
      });
    } else {
      this.loginForm.markAllAsTouched();
      this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'Por favor, complete todos los campos requeridos.' });
    }
  }

  private redirectToFirstAvailableModule() {
    const defaultRoute = this.authService.getDefaultRoute();
    if (defaultRoute === '/login') {
      this.isLoading = false;
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Acceso Denegado', 
        detail: 'No tienes módulos asignados. Contacta al administrador.' 
      });
      this.authService.logout(); 
      this.cdr.detectChanges(); 
    } else {
      this.router.navigate([defaultRoute]);
    }
  }
}
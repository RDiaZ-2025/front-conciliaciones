import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ThemeService } from '../../../../core/services/theme.service';
import { CommonModule } from '@angular/common';
import { SYSTEM_MODULES } from '../../../../core/config/modules.config';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  public themeService = inject(ThemeService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  errorMsg = '';
  isLoading = false;

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMsg = '';
      const { email, password } = this.loginForm.value;

      // Enviamos el email como 'username' porque el backend espera ese campo en OAuth2PasswordRequestForm
      this.authService.login({ username: email, password }).subscribe({
        next: () => {
          this.redirectToFirstAvailableModule();
        },
        error: (err) => {
          this.isLoading = false;

          // Extraemos el mensaje del backend si existe
          if (err.error && err.error.detail) {
            this.errorMsg = err.error.detail;
          } else {
            this.errorMsg = 'Usuario o contraseña incorrectos';
          }

          console.error(err);
          this.cdr.detectChanges(); // Forzamos actualización de la UI
        }
      });
    } else {
      this.loginForm.markAllAsTouched();
    }
  }

  private redirectToFirstAvailableModule() {
    const defaultRoute = this.authService.getDefaultRoute();
    if (defaultRoute === '/login') {
      this.isLoading = false;
      this.errorMsg = 'No tienes módulos asignados. Contacta al administrador.';
      this.authService.logout(); // Limpiar el token
      this.cdr.detectChanges(); // Forzar actualización de la UI
    } else {
      this.router.navigate([defaultRoute]);
    }
  }
}
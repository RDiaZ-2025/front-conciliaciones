import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login.component.spec.ts.component.html',
  styleUrls: ['./login.component.spec.ts.component.scss']
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

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
          this.router.navigate(['/admin/dashboard']); // Redirigir al dashboard
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMsg = 'Usuario o contraseña incorrectos';
          console.error(err);
        }
      });
    } else {
      this.loginForm.markAllAsTouched();
    }
  }
}
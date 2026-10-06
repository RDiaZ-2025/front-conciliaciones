import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../services/auth.service';

const MIN_PASSWORD_LENGTH = 8;

@Component({
  selector: 'app-change-password-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, ButtonModule, PasswordModule],
  templateUrl: './change-password-dialog.component.html',
  styleUrl: './change-password-dialog.component.scss'
})
export class ChangePasswordDialogComponent {
  private authService = inject(AuthService);
  private messageService = inject(MessageService);

  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  readonly minLength = MIN_PASSWORD_LENGTH;

  currentPassword = signal<string>('');
  newPassword = signal<string>('');
  confirmPassword = signal<string>('');
  errorMessage = signal<string>('');
  saving = signal<boolean>(false);

  onShow(): void {
    this.resetForm();
  }

  close(): void {
    if (this.saving()) return;
    this.visible = false;
    this.visibleChange.emit(false);
  }

  submit(): void {
    const validationError = this.validate();
    if (validationError) {
      this.errorMessage.set(validationError);
      return;
    }

    this.errorMessage.set('');
    this.saving.set(true);

    this.authService.changePassword(this.currentPassword(), this.newPassword()).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Contraseña actualizada',
          detail: res?.message || 'Tu contraseña fue cambiada correctamente.'
        });
        this.close();
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err?.error?.message || 'No se pudo cambiar la contraseña. Intenta de nuevo.');
      }
    });
  }

  private validate(): string | null {
    const current = this.currentPassword();
    const next = this.newPassword();
    const confirm = this.confirmPassword();

    if (!current || !next || !confirm) return 'Todos los campos son obligatorios.';
    if (next.length < MIN_PASSWORD_LENGTH) return `La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
    if (next !== confirm) return 'La nueva contraseña y su confirmación no coinciden.';
    if (next === current) return 'La nueva contraseña debe ser diferente a la actual.';
    return null;
  }

  private resetForm(): void {
    this.currentPassword.set('');
    this.newPassword.set('');
    this.confirmPassword.set('');
    this.errorMessage.set('');
    this.saving.set(false);
  }
}

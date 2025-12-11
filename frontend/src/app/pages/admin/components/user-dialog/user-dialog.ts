import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { MultiSelectModule } from 'primeng/multiselect';
import { User, Permission, UserService } from '../../../../services/user';
import { PERMISSION_LABELS, PERMISSION_DESCRIPTIONS } from '../../../../constants/permissions';

export interface UserDialogData {
  user?: User;
  isEdit: boolean;
}

@Component({
  selector: 'app-user-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    MultiSelectModule
  ],
  template: `
    <form [formGroup]="userForm" class="flex flex-column gap-3 pt-3" style="min-width: 400px;">
      <div class="field">
        <label for="name" class="font-bold block mb-2">Nombre</label>
        <input pInputText id="name" formControlName="name" class="w-full" placeholder="Nombre completo" />
        <small class="p-error block" *ngIf="userForm.get('name')?.hasError('required') && userForm.get('name')?.touched">
          El nombre es requerido
        </small>
      </div>

      <div class="field">
        <label for="email" class="font-bold block mb-2">Email</label>
        <input pInputText id="email" formControlName="email" type="email" class="w-full" placeholder="correo@ejemplo.com" />
        <small class="p-error block" *ngIf="userForm.get('email')?.hasError('required') && userForm.get('email')?.touched">
          El email es requerido
        </small>
        <small class="p-error block" *ngIf="userForm.get('email')?.hasError('email') && userForm.get('email')?.touched">
          Email inválido
        </small>
      </div>

      <div class="field">
        <label for="password" class="font-bold block mb-2">
          {{ config.data.isEdit ? 'Nueva Contraseña (opcional)' : 'Contraseña' }}
        </label>
        <p-password id="password" formControlName="password" [toggleMask]="true" [feedback]="false" styleClass="w-full" inputStyleClass="w-full"></p-password>
        <small class="p-error block" *ngIf="userForm.get('password')?.hasError('required') && userForm.get('password')?.touched">
          La contraseña es requerida
        </small>
      </div>

      <div class="field">
        <label for="permissions" class="font-bold block mb-2">Permisos</label>
        <p-multiSelect 
          id="permissions" 
          [options]="availablePermissions" 
          formControlName="permissions" 
          optionLabel="name" 
          optionValue="name" 
          display="chip" 
          placeholder="Seleccionar permisos"
          styleClass="w-full">
          <ng-template let-perm pTemplate="item">
            <div class="flex flex-column">
              <span class="font-bold">{{ getPermissionLabel(perm.name) }}</span>
              <span class="text-sm text-500">{{ getPermissionDescription(perm.name) }}</span>
            </div>
          </ng-template>
          <ng-template let-perm pTemplate="selectedItem">
             {{ getPermissionLabel(perm.name) }}
          </ng-template>
        </p-multiSelect>
      </div>

      <div class="flex justify-content-end gap-2 mt-4">
        <p-button label="Cancelar" icon="pi pi-times" (onClick)="ref.close()" severity="secondary"></p-button>
        <p-button label="{{ config.data.isEdit ? 'Actualizar' : 'Crear' }}" icon="pi pi-check" (onClick)="onSubmit()" [disabled]="userForm.invalid"></p-button>
      </div>
    </form>
  `
})
export class UserDialogComponent implements OnInit {
  userForm: FormGroup;
  availablePermissions: Permission[] = [];
  userService = inject(UserService);

  constructor(
    private fb: FormBuilder,
    public ref: DynamicDialogRef,
    public config: DynamicDialogConfig
  ) {
    const data = this.config.data;
    this.userForm = this.fb.group({
      name: [data.user?.name || '', Validators.required],
      email: [{ value: data.user?.email || '', disabled: data.isEdit }, [Validators.required, Validators.email]],
      password: ['', data.isEdit ? [] : [Validators.required]],
      permissions: [data.user?.permissions || []]
    });
  }

  ngOnInit() {
    this.loadPermissions();
  }

  loadPermissions() {
    this.userService.getAllPermissions().subscribe(perms => {
      this.availablePermissions = perms;
    });
  }

  onSubmit() {
    if (this.userForm.valid) {
      this.ref.close(this.userForm.getRawValue());
    }
  }

  getPermissionLabel(permName: string): string {
    return PERMISSION_LABELS[permName as keyof typeof PERMISSION_LABELS] || permName;
  }

  getPermissionDescription(permName: string): string {
    return PERMISSION_DESCRIPTIONS[permName as keyof typeof PERMISSION_DESCRIPTIONS] || '';
  }
}

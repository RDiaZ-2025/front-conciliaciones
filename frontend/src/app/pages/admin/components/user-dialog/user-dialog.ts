import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { MultiSelectModule } from 'primeng/multiselect';
import { FloatLabelModule } from 'primeng/floatlabel';
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
    MultiSelectModule,
    FloatLabelModule
  ],
  templateUrl: './user-dialog.html'
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

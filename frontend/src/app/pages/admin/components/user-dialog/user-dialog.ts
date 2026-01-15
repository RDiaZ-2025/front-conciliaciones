import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { FloatLabelModule } from 'primeng/floatlabel';
import { User, Permission, UserService } from '../../../../services/user.service';
import { TeamService } from '../../../../services/team.service';
import { Team } from '../../../production/production.models';
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
    SelectModule,
    FloatLabelModule
  ],
  templateUrl: './user-dialog.html'
})
export class UserDialogComponent implements OnInit {
  userForm: FormGroup;
  availablePermissions: Permission[] = [];
  teams: Team[] = [];
  userService = inject(UserService);
  teamService = inject(TeamService);
  cd = inject(ChangeDetectorRef);

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
      permissions: [data.user?.permissions || []],
      teamId: [data.user?.teamId || null]
    });
  }

  ngOnInit() {
    this.loadPermissions();
    this.loadTeams();
  }

  loadPermissions() {
    this.userService.getAllPermissions().subscribe(perms => {
      this.availablePermissions = perms;
      this.cd.markForCheck();
    });
  }

  loadTeams() {
    this.teamService.getTeams().subscribe(response => {
      if (response.success) {
        this.teams = response.data;
        this.cd.markForCheck();
      }
    });
  }

  onSubmit() {
    if (this.userForm.valid) {
      const formValue = this.userForm.getRawValue();
      // Ensure teamId is a number if present
      if (formValue.teamId) {
        formValue.teamId = Number(formValue.teamId);
      }
      this.ref.close(formValue);
    }
  }

  getPermissionLabel(permName: string): string {
    return PERMISSION_LABELS[permName as keyof typeof PERMISSION_LABELS] || permName;
  }

  getPermissionDescription(permName: string): string {
    return PERMISSION_DESCRIPTIONS[permName as keyof typeof PERMISSION_DESCRIPTIONS] || '';
  }
}

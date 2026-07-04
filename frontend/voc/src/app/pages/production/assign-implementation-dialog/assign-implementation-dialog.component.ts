import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { TeamService } from '../../../services/team.service';
import { User } from '../../../services/user.service';

@Component({
  selector: 'app-assign-implementation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    SelectModule
  ],
  templateUrl: './assign-implementation-dialog.component.html',
  styleUrls: ['./assign-implementation-dialog.component.scss']
})
export class AssignImplementationDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private teamService = inject(TeamService);
  public ref = inject(DynamicDialogRef);
  public config = inject(DynamicDialogConfig);

  form: FormGroup;
  users = signal<User[]>([]);
  isLoadingUsers = signal<boolean>(false);

  unitOptions = [
    { label: 'ATL', value: 'ATL' },
    { label: 'Adendas - Multiproducto', value: 'Adendas - Multiproducto' },
    { label: 'Digital', value: 'Digital' }
  ];

  constructor() {
    this.form = this.fb.group({
      unit: [null, Validators.required],
      assignedUser: [null, Validators.required]
    });
  }

  ngOnInit() {
    this.loadOperationsUsers();
  }

  loadOperationsUsers() {
    this.isLoadingUsers.set(true);
    // Team ID 2 is Operaciones
    this.teamService.getUsersByTeam(2).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.users.set(response.data);
        }
        this.isLoadingUsers.set(false);
      },
      error: (err: any) => {
        console.error('Error loading operations users:', err);
        this.isLoadingUsers.set(false);
      }
    });
  }

  cancel() {
    this.ref.close();
  }

  confirm() {
    if (this.form.valid) {
      this.ref.close(this.form.value);
    }
  }
}

import { LucideIconComponent } from '../../../components/lucide-icon/lucide-icon.component';
import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { TeamService } from '../../../services/team.service';
import { UserService, User } from '../../../services/user.service';
import { Team } from '../../../models/common/team';
import { Subteam } from '../../../models/common/subteam';

@Component({
  selector: 'app-subteam-dialog',
  standalone: true,
  imports: [
    LucideIconComponent,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    MultiSelectModule,
    TooltipModule
  ],
  templateUrl: './subteam-dialog.component.html',
  styleUrl: './subteam-dialog.component.scss'
})
export class SubteamDialogComponent implements OnInit, OnChanges {
  private fb = inject(FormBuilder);
  private teamService = inject(TeamService);
  private userService = inject(UserService);
  private messageService = inject(MessageService);

  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Input() team: Team | null = null;
  @Input() subteam: Subteam | null = null;
  @Output() save = new EventEmitter<void>();

  form: FormGroup;
  saving = signal(false);
  users = signal<User[]>([]);

  constructor() {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      leaderId: [null],
      userIds: [[]]
    });
  }

  ngOnInit() {
    this.loadUsers();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible'] && this.visible) {
      this.resetForm();
    }
  }

  loadUsers() {
    this.userService.getAllUsers().subscribe({
      next: (list) => {
        this.users.set((list || []).filter((u: any) => u.status === 1 || u.status === undefined));
      },
      error: () => {}
    });
  }

  resetForm() {
    if (this.subteam) {
      const selectedUserIds = (this.subteam.subteamUsers || []).map(su => su.userId);
      this.form.patchValue({
        name: this.subteam.name,
        description: this.subteam.description,
        leaderId: this.subteam.leaderId || null,
        userIds: selectedUserIds
      });
    } else {
      this.form.reset({
        name: '',
        description: '',
        leaderId: null,
        userIds: []
      });
    }
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.team && !this.subteam) {
      return;
    }

    this.saving.set(true);
    const formVal = this.form.value;

    const payload = {
      name: formVal.name.trim(),
      description: formVal.description ? formVal.description.trim() : null,
      leaderId: formVal.leaderId ? Number(formVal.leaderId) : null,
      userIds: formVal.userIds ? formVal.userIds.map(Number) : []
    };

    const teamId = this.team ? this.team.id : (this.subteam ? this.subteam.teamId : 0);

    const req$ = this.subteam
      ? this.teamService.updateSubteam(this.subteam.id, payload)
      : this.teamService.createSubteam(teamId, payload);

    req$.subscribe({
      next: (res) => {
        if (res.success) {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: this.subteam ? 'Subequipo actualizado exitosamente' : 'Subequipo creado exitosamente'
          });
          this.save.emit();
          this.visibleChange.emit(false);
        }
        this.saving.set(false);
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err.error?.message || 'Error al guardar subequipo'
        });
        this.saving.set(false);
      }
    });
  }

  cancel() {
    this.visibleChange.emit(false);
  }
}

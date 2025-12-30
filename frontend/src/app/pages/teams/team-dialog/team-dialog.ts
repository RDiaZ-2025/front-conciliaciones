import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { PickListModule } from 'primeng/picklist';
import { TeamService } from '../../../services/team.service';
import { UserService, User } from '../../../services/user.service';
import { Team } from '../../production/production.models';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-team-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    PickListModule
  ],
  templateUrl: './team-dialog.html',
  styleUrl: './team-dialog.scss'
})
export class TeamDialogComponent implements OnChanges {
  private fb = inject(FormBuilder);
  private teamService = inject(TeamService);
  private userService = inject(UserService);
  private messageService = inject(MessageService);

  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Input() team: Team | null = null;
  @Output() save = new EventEmitter<void>();

  form: FormGroup;
  saving = signal(false);
  
  // PickList data
  sourceUsers = signal<User[]>([]);
  targetUsers = signal<User[]>([]);

  constructor() {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: ['']
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible'] && this.visible) {
      this.resetForm();
      this.loadUsers();
    }
  }

  resetForm() {
    if (this.team) {
      this.form.patchValue({
        name: this.team.name,
        description: this.team.description
      });
    } else {
      this.form.reset({
        name: '',
        description: ''
      });
      this.targetUsers.set([]);
    }
  }

  loadUsers() {
    // Load all users
    this.userService.getAllUsers().subscribe(users => {
      if (this.team) {
        // Load team users
        this.teamService.getUsersByTeam(this.team.id).subscribe(response => {
          if (response.success) {
            const teamUsers = response.data;
            this.targetUsers.set(teamUsers);
            
            // Filter source users (All - Team Users)
            // We use user ID to filter
            const teamUserIds = new Set(teamUsers.map(u => u.id));
            this.sourceUsers.set(users.filter(u => !teamUserIds.has(u.id)));
          }
        });
      } else {
        this.sourceUsers.set(users);
        this.targetUsers.set([]);
      }
    });
  }

  onSubmit() {
    if (this.form.valid) {
      this.saving.set(true);
      const formData = this.form.value;
      const userIds = this.targetUsers().map(u => u.id);

      const request = this.team ? 
        this.teamService.updateTeam(this.team.id, formData) :
        this.teamService.createTeam(formData);

      request.subscribe({
        next: (response) => {
          if (response.success) {
            // Update users
            const teamId = this.team ? this.team.id : response.data.id;
            this.teamService.updateTeamUsers(teamId, userIds).subscribe({
              next: () => {
                this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Equipo guardado' });
                this.save.emit();
                this.visibleChange.emit(false);
                this.saving.set(false);
              },
              error: () => {
                 this.messageService.add({ severity: 'warn', summary: 'Advertencia', detail: 'Equipo guardado pero error al asignar usuarios' });
                 this.save.emit(); // Still emit save as team was created/updated
                 this.visibleChange.emit(false);
                 this.saving.set(false);
              }
            });
          }
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al guardar equipo' });
          this.saving.set(false);
        }
      });
    }
  }
  
  cancel() {
    this.visibleChange.emit(false);
  }
}

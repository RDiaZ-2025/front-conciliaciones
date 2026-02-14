import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TeamService } from '../../../services/team.service';
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
    TextareaModule
  ],
  templateUrl: './team-dialog.html',
  styleUrl: './team-dialog.scss'
})
export class TeamDialogComponent implements OnChanges {
  private fb = inject(FormBuilder);
  private teamService = inject(TeamService);
  private messageService = inject(MessageService);

  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Input() team: Team | null = null;
  @Output() save = new EventEmitter<void>();

  form: FormGroup;
  saving = signal(false);

  constructor() {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: ['']
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible'] && this.visible) {
      this.resetForm();
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
    }
  }

  onSubmit() {
    if (this.form.valid) {
      this.saving.set(true);
      const formData = this.form.value;

      const request = this.team ?
        this.teamService.updateTeam(this.team.id, formData) :
        this.teamService.createTeam(formData);

      request.subscribe({
        next: (response) => {
          if (response.success) {
            this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Equipo guardado' });
            this.save.emit();
            this.visibleChange.emit(false);
            this.saving.set(false);
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

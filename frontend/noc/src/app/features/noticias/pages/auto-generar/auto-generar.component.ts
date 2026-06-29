import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';

// PrimeNG Imports
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';
import { MessageService, ConfirmationService } from 'primeng/api';

import { NewsSchedulerService, NewsSchedule } from '../../services/news-scheduler.service';

@Component({
  selector: 'app-auto-generar',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
    SelectModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './auto-generar.component.html',
  styleUrl: './auto-generar.component.css'
})
export class AutoGenerarComponent implements OnInit {
  schedules = signal<NewsSchedule[]>([]);
  displayDialog = false;
  isEditMode = false;
  currentScheduleId: string | null = null;
  executingIds = signal<Set<string>>(new Set());

  scheduleForm!: FormGroup;

  frequencyOptions = [
    { label: 'Cada 15 minutos', value: 15 },
    { label: 'Cada 30 minutos', value: 30 },
    { label: 'Cada 1 hora', value: 60 },
    { label: 'Cada 2 horas', value: 120 },
    { label: 'Cada 6 horas', value: 360 },
    { label: 'Cada 12 horas', value: 720 },
    { label: 'Cada 24 horas (Diario)', value: 1440 },
    { label: 'Cada 48 horas', value: 2880 },
    { label: 'Cada 7 días (Semanal)', value: 10080 }
  ];

  constructor(
    private fb: FormBuilder,
    private schedulerService: NewsSchedulerService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadSchedules();
  }

  private initForm(): void {
    const now = new Date();
    const nowISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

    this.scheduleForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      topic: ['', [Validators.required, Validators.minLength(3)]],
      userInstructions: [''],
      sources: this.fb.array([this.fb.control('', [Validators.required])]),
      startAt: [nowISO, [Validators.required]],
      intervalMinutes: [1440, [Validators.required]],
      isActive: [true]
    });
  }

  get sourcesArray(): FormArray {
    return this.scheduleForm.get('sources') as FormArray;
  }

  addSource(urlValue: string = ''): void {
    this.sourcesArray.push(this.fb.control(urlValue, [Validators.required]));
  }

  removeSource(index: number): void {
    if (this.sourcesArray.length > 1) {
      this.sourcesArray.removeAt(index);
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atención',
        detail: 'Debe haber al menos una fuente de información.'
      });
    }
  }

  loadSchedules(): void {
    this.schedulerService.getSchedules().subscribe({
      next: (data) => this.schedules.set(data),
      error: (err) => console.error('Error loading news schedules', err)
    });
  }

  openNew(): void {
    this.isEditMode = false;
    this.currentScheduleId = null;
    const now = new Date();
    const nowISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

    this.scheduleForm.reset({
      name: '',
      topic: '',
      userInstructions: '',
      startAt: nowISO,
      intervalMinutes: 1440,
      isActive: true
    });

    this.sourcesArray.clear();
    this.addSource('');
    this.displayDialog = true;
  }

  editSchedule(schedule: NewsSchedule): void {
    this.isEditMode = true;
    this.currentScheduleId = schedule.id;

    let formattedStartAt = schedule.startAt;
    if (formattedStartAt && formattedStartAt.length > 16) {
      formattedStartAt = formattedStartAt.slice(0, 16);
    }

    this.scheduleForm.patchValue({
      name: schedule.name,
      topic: schedule.topic,
      userInstructions: schedule.userInstructions || '',
      startAt: formattedStartAt,
      intervalMinutes: schedule.intervalMinutes,
      isActive: schedule.isActive
    });

    this.sourcesArray.clear();
    if (schedule.sources && schedule.sources.length > 0) {
      schedule.sources.forEach(url => this.addSource(url));
    } else {
      this.addSource('');
    }

    this.displayDialog = true;
  }

  saveSchedule(): void {
    if (this.scheduleForm.invalid) {
      this.scheduleForm.markAllAsTouched();
      this.messageService.add({
        severity: 'error',
        summary: 'Formulario Inválido',
        detail: 'Por favor completa todos los campos requeridos y asegúrate de agregar al menos una URL válida.'
      });
      return;
    }

    const formVal = this.scheduleForm.value;
    const sourcesFiltered = formVal.sources.filter((s: string) => s && s.trim().length > 0);

    if (sourcesFiltered.length === 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Fuentes Requeridas',
        detail: 'Debes incluir al menos una fuente válida.'
      });
      return;
    }

    const schedulePayload = {
      name: formVal.name,
      topic: formVal.topic,
      userInstructions: formVal.userInstructions?.trim() ? formVal.userInstructions.trim() : null,
      sources: sourcesFiltered,
      startAt: formVal.startAt,
      intervalMinutes: Number(formVal.intervalMinutes),
      isActive: formVal.isActive
    };

    if (this.isEditMode && this.currentScheduleId) {
      this.schedulerService.updateSchedule(this.currentScheduleId, schedulePayload).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Agendamiento actualizado correctamente.'
          });
          this.loadSchedules();
          this.displayDialog = false;
        },
        error: (err) => {
          console.error('Error updating schedule', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo actualizar el agendamiento.'
          });
        }
      });
    } else {
      this.schedulerService.createSchedule(schedulePayload).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Nuevo agendamiento creado correctamente.'
          });
          this.loadSchedules();
          this.displayDialog = false;
        },
        error: (err) => {
          console.error('Error creating schedule', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo crear el agendamiento.'
          });
        }
      });
    }
  }

  toggleActive(schedule: NewsSchedule): void {
    this.schedulerService.toggleActive(schedule.id).subscribe({
      next: (updated) => {
        this.messageService.add({
          severity: 'info',
          summary: 'Estado Actualizado',
          detail: `El agendamiento "${schedule.name}" ahora está ${updated.isActive ? 'Activo' : 'Inactivo'}.`
        });
        this.loadSchedules();
      },
      error: (err) => {
        console.error('Error toggling schedule active state', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cambiar el estado del agendamiento.'
        });
      }
    });
  }

  confirmDelete(schedule: NewsSchedule): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de que deseas eliminar el agendamiento "${schedule.name}"?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.schedulerService.deleteSchedule(schedule.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Eliminado',
              detail: 'El agendamiento ha sido eliminado.'
            });
            this.loadSchedules();
          },
          error: (err) => {
            console.error('Error deleting schedule', err);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo eliminar el agendamiento.'
            });
          }
        });
      }
    });
  }

  executeNow(schedule: NewsSchedule): void {
    const currentExecuting = new Set(this.executingIds());
    currentExecuting.add(schedule.id);
    this.executingIds.set(currentExecuting);

    this.messageService.add({
      severity: 'info',
      summary: 'Iniciando Generación',
      detail: `Enviando solicitud a la IA para el tema "${schedule.topic}"...`
    });

    this.schedulerService.triggerNow(schedule).subscribe({
      next: () => {
        this.schedulerService.recordExecution(schedule.id).subscribe({
          next: () => this.loadSchedules(),
          error: () => this.loadSchedules()
        });
        this.messageService.add({
          severity: 'success',
          summary: 'Noticia Generada',
          detail: 'El webhook de generación de noticias respondió con éxito.'
        });
        this.removeExecuting(schedule.id);
      },
      error: (err) => {
        console.error('Error triggering webhook', err);
        this.schedulerService.recordExecution(schedule.id).subscribe({
          next: () => this.loadSchedules(),
          error: () => this.loadSchedules()
        });
        this.messageService.add({
          severity: 'warn',
          summary: 'Solicitud Enviada',
          detail: 'La solicitud fue enviada al webhook de generación.'
        });
        this.removeExecuting(schedule.id);
      }
    });
  }

  private removeExecuting(id: string): void {
    const currentExecuting = new Set(this.executingIds());
    currentExecuting.delete(id);
    this.executingIds.set(currentExecuting);
  }

  isExecuting(id: string): boolean {
    return this.executingIds().has(id);
  }

  getFrequencyLabel(minutes: number): string {
    const option = this.frequencyOptions.find(o => o.value === minutes);
    if (option) return option.label;
    if (minutes < 60) return `Cada ${minutes} minutos`;
    if (minutes < 1440) return `Cada ${Math.floor(minutes / 60)} horas`;
    return `Cada ${Math.floor(minutes / 1440)} días`;
  }
}

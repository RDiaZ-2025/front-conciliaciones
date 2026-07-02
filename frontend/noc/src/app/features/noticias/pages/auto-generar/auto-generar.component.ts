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
import { SelectButtonModule } from 'primeng/selectbutton';
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
    SelectModule,
    SelectButtonModule
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

  scheduleTypeOptions = [
    { label: 'Por Intervalo', value: 'interval' },
    { label: 'Diario (Hora Fija)', value: 'daily' },
    { label: 'Horas Específicas al día', value: 'specific_hours' }
  ];

  frequencyOptions = [
    { label: 'Cada 15 minutos', value: 15 },
    { label: 'Cada 30 minutos', value: 30 },
    { label: 'Cada 1 hora', value: 60 },
    { label: 'Cada 2 horas', value: 120 },
    { label: 'Cada 6 horas', value: 360 },
    { label: 'Cada 12 horas', value: 720 },
    { label: 'Cada 24 horas (Diario)', value: 1440 }
  ];

  daysOfWeekOptions = [
    { label: 'Lun', value: 1 },
    { label: 'Mar', value: 2 },
    { label: 'Mié', value: 3 },
    { label: 'Jue', value: 4 },
    { label: 'Vie', value: 5 },
    { label: 'Sáb', value: 6 },
    { label: 'Dom', value: 0 }
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
      // Unified inputs
      intervalMinutes: [0, [Validators.required]], // 0 = weekly day/time rules, >0 = regular intervals
      endAt: [''],
      weeklyRules: this.fb.array([]),
      isActive: [true]
    });

    // Make sure we have at least one weekly rule by default
    this.addWeeklyRule(1, '12:00'); // Default Monday at 12:00
  }

  get sourcesArray(): FormArray {
    return this.scheduleForm.get('sources') as FormArray;
  }

  get weeklyRulesArray(): FormArray {
    return this.scheduleForm.get('weeklyRules') as FormArray;
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

  addWeeklyRule(day: number = 1, time: string = '12:00'): void {
    this.weeklyRulesArray.push(this.fb.group({
      dayOfWeek: [day, [Validators.required]],
      time: [time, [Validators.required, Validators.pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)]]
    }));
  }

  removeWeeklyRule(index: number): void {
    if (this.weeklyRulesArray.length > 1) {
      this.weeklyRulesArray.removeAt(index);
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atención',
        detail: 'Debe ingresar al menos una regla de ejecución.'
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
      intervalMinutes: 0,
      endAt: '',
      isActive: true
    });

    this.sourcesArray.clear();
    this.addSource('');
    this.weeklyRulesArray.clear();
    this.addWeeklyRule(1, '12:00');
    this.displayDialog = true;
  }

  editSchedule(schedule: NewsSchedule): void {
    this.isEditMode = true;
    this.currentScheduleId = schedule.id;

    let formattedStartAt = schedule.startAt;
    if (formattedStartAt && formattedStartAt.length > 16) {
      formattedStartAt = formattedStartAt.slice(0, 16);
    }

    const config = schedule.scheduleConfig || {};
    const intervalMin = config.intervalMinutes || 0;

    this.scheduleForm.patchValue({
      name: schedule.name,
      topic: schedule.topic,
      userInstructions: schedule.userInstructions || '',
      startAt: formattedStartAt,
      intervalMinutes: intervalMin,
      endAt: config.endAt ? config.endAt.slice(0, 16) : '',
      isActive: schedule.isActive
    });

    this.sourcesArray.clear();
    if (schedule.sources && schedule.sources.length > 0) {
      schedule.sources.forEach(url => this.addSource(url));
    } else {
      this.addSource('');
    }

    this.weeklyRulesArray.clear();
    if (config.weeklyRules && config.weeklyRules.length > 0) {
      config.weeklyRules.forEach((rule: any) => this.addWeeklyRule(rule.dayOfWeek, rule.time));
    } else if (intervalMin === 0) {
      // Fallback from old config models
      if (config.times && config.times.length > 0) {
        config.times.forEach((t: string) => {
          if (config.daysOfWeek && config.daysOfWeek.length > 0) {
            config.daysOfWeek.forEach((d: number) => this.addWeeklyRule(d, t));
          } else {
            // Default everyday (Mon-Sun) if no day filters existed
            [1, 2, 3, 4, 5, 6, 0].forEach(d => this.addWeeklyRule(d, t));
          }
        });
      } else {
        this.addWeeklyRule(1, '12:00');
      }
    }

    this.displayDialog = true;
  }

  saveSchedule(): void {
    if (this.scheduleForm.invalid) {
      this.scheduleForm.markAllAsTouched();
      this.messageService.add({
        severity: 'error',
        summary: 'Formulario Inválido',
        detail: 'Por favor completa todos los campos requeridos.'
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

    // Build the simplified configuration JSON
    const interval = Number(formVal.intervalMinutes);
    let scheduleConfig: any = {};

    if (interval > 0) {
      scheduleConfig.intervalMinutes = interval;
    } else {
      const rules = formVal.weeklyRules || [];
      if (rules.length === 0) {
        this.messageService.add({
          severity: 'error',
          summary: 'Reglas Requeridas',
          detail: 'Debes ingresar al menos una regla de día y hora.'
        });
        return;
      }
      scheduleConfig.weeklyRules = rules.map((r: any) => ({
        dayOfWeek: Number(r.dayOfWeek),
        time: r.time
      }));
    }

    if (formVal.endAt) {
      scheduleConfig.endAt = formVal.endAt;
    }

    const schedulePayload = {
      name: formVal.name,
      topic: formVal.topic,
      userInstructions: formVal.userInstructions?.trim() ? formVal.userInstructions.trim() : null,
      sources: sourcesFiltered,
      startAt: formVal.startAt,
      intervalMinutes: interval > 0 ? interval : 1440,
      scheduleConfig,
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

  getFrequencyLabel(schedule: NewsSchedule): string {
    const config = schedule.scheduleConfig || {};
    const intervalMin = config.intervalMinutes || 0;
    
    // Day of week labels dictionary
    const dayNames: { [key: number]: string } = {
      1: 'Lun',
      2: 'Mar',
      3: 'Mié',
      4: 'Jue',
      5: 'Vie',
      6: 'Sáb',
      0: 'Dom'
    };

    let label = '';
    if (intervalMin > 0) {
      const option = this.frequencyOptions.find(o => o.value === intervalMin);
      if (option) {
        label = option.label;
      } else {
        if (intervalMin < 60) label = `Cada ${intervalMin} minutos`;
        else if (intervalMin < 1440) label = `Cada ${Math.floor(intervalMin / 60)} horas`;
        else label = `Cada ${Math.floor(intervalMin / 1440)} días`;
      }
      
      if (config.daysOfWeek && config.daysOfWeek.length > 0) {
        const names = config.daysOfWeek.map((d: number) => dayNames[d]);
        label += ` (Días: ${names.join(', ')})`;
      }
    } else {
      const rules = config.weeklyRules || [];
      if (rules.length === 0) {
        label = 'Sin programar';
      } else {
        // Group times by dayOfWeek to display nicely (e.g. "Lun: 09:00, 22:00 | Mar: 15:00")
        const grouped: { [key: number]: string[] } = {};
        rules.forEach((r: any) => {
          if (!grouped[r.dayOfWeek]) {
            grouped[r.dayOfWeek] = [];
          }
          grouped[r.dayOfWeek].push(r.time);
        });

        const sortedDays = Object.keys(grouped).map(Number).sort((a, b) => {
          // Sort Mon-Sun (1,2,3,4,5,6,0)
          const order = [1, 2, 3, 4, 5, 6, 0];
          return order.indexOf(a) - order.indexOf(b);
        });

        label = sortedDays.map(d => `${dayNames[d]}: ${grouped[d].join(', ')}`).join(' | ');
      }
    }

    if (config.endAt) {
      const endFormatted = new Date(config.endAt).toLocaleDateString();
      label += ` (hasta ${endFormatted})`;
    }
    return label;
  }
}

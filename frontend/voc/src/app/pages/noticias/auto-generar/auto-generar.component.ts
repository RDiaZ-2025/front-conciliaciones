import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideIconComponent } from '../../../components/lucide-icon/lucide-icon.component';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

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

import { NewsSchedulerService, NewsSchedule, NewsBlock, NewsArticleData, NewsDraftDetail } from '../../../services/news-scheduler.service';

@Component({
  selector: 'app-auto-generar',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
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
    SelectButtonModule,
    LucideIconComponent
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
  activeGenerationsCount = signal<Map<string, number>>(new Map());

  getGeneratingCount(scheduleId: string): number {
    return this.activeGenerationsCount().get(scheduleId) || 0;
  }

  isGenerating(scheduleId: string): boolean {
    return this.getGeneratingCount(scheduleId) > 0;
  }

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
    private confirmationService: ConfirmationService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadSchedules();
  }

  private toLocalDatetimeInput(dateInput: string | Date | null | undefined): string {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }

  private initForm(): void {
    const nowLocal = this.toLocalDatetimeInput(new Date());

    this.scheduleForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      topic: ['', [Validators.required, Validators.minLength(3)]],
      userInstructions: [''],
      sources: this.fb.array([this.fb.control('', [Validators.required])]),
      startAt: [nowLocal, [Validators.required]],

      intervalMinutes: [0, [Validators.required]],
      endAt: [''],
      weeklyRules: this.fb.array([]),
      isActive: [true],
      publishAutomatically: [false]
    });

    this.addWeeklyRule(1, '12:00');
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
    const nowLocal = this.toLocalDatetimeInput(new Date());

    this.scheduleForm.reset({
      name: '',
      topic: '',
      userInstructions: '',
      startAt: nowLocal,
      intervalMinutes: 0,
      endAt: '',
      isActive: true,
      publishAutomatically: false
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

    const formattedStartAt = this.toLocalDatetimeInput(schedule.startAt);

    const config = schedule.scheduleConfig || {};
    const intervalMin = config.intervalMinutes || 0;

    this.scheduleForm.patchValue({
      name: schedule.name,
      topic: schedule.topic,
      userInstructions: schedule.userInstructions || '',
      startAt: formattedStartAt,
      intervalMinutes: intervalMin,
      endAt: this.toLocalDatetimeInput(config.endAt),
      isActive: schedule.isActive,
      publishAutomatically: schedule.publishAutomatically || false
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

      if (config.times && config.times.length > 0) {
        config.times.forEach((t: string) => {
          if (config.daysOfWeek && config.daysOfWeek.length > 0) {
            config.daysOfWeek.forEach((d: number) => this.addWeeklyRule(d, t));
          } else {

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
      isActive: formVal.isActive,
      publishAutomatically: formVal.publishAutomatically
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
      icon: 'alert-triangle',
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
    const map = new Map(this.activeGenerationsCount());
    const current = map.get(schedule.id) || 0;
    map.set(schedule.id, current + 1);
    this.activeGenerationsCount.set(map);

    this.messageService.add({
      severity: 'info',
      summary: 'Iniciando Generación',
      detail: `Enviando solicitud a la IA para el tema "${schedule.topic}"...`
    });

    this.schedulerService.triggerNow(schedule.id).subscribe({
      next: (res: any) => {
        this.decrementGenerating(schedule.id);
        this.loadSchedules();
        this.messageService.add({
          severity: 'success',
          summary: 'Noticia Generada',
          detail: `La noticia sobre "${schedule.topic}" se ha generado con éxito.`
        });
        if (res?.draft) {
          this.messageService.add({
            severity: 'info',
            summary: 'Borrador Registrado',
            detail: 'La noticia se ha guardado en la bandeja de borradores pendientes.'
          });
        }
      },
      error: (err) => {
        console.error('Error al ejecutar agendamiento:', err);
        this.decrementGenerating(schedule.id);
        this.loadSchedules();
        this.messageService.add({
          severity: 'error',
          summary: 'Error al Generar',
          detail: err?.error?.message || 'Ocurrió un error al ejecutar la generación de noticias.'
        });
      }
    });
  }

  private decrementGenerating(id: string): void {
    const map = new Map(this.activeGenerationsCount());
    const count = map.get(id) || 0;
    if (count <= 1) {
      map.delete(id);
    } else {
      map.set(id, count - 1);
    }
    this.activeGenerationsCount.set(map);
  }

  getFrequencyLabel(schedule: NewsSchedule): string {
    const config = schedule.scheduleConfig || {};
    const intervalMin = config.intervalMinutes || 0;

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

        const grouped: { [key: number]: string[] } = {};
        rules.forEach((r: any) => {
          if (!grouped[r.dayOfWeek]) {
            grouped[r.dayOfWeek] = [];
          }
          grouped[r.dayOfWeek].push(r.time);
        });

        const sortedDays = Object.keys(grouped).map(Number).sort((a, b) => {

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

  displayDraftsDialog = false;
  selectedScheduleForDrafts: NewsSchedule | null = null;
  pendingDrafts = signal<any[]>([]);
  loadingDrafts = signal(false);

  displayEditorDialog = false;
  currentDraft: NewsDraftDetail | null = null;
  currentArticleData: NewsArticleData = {
    title: '',
    subtitle: '',
    blocks: [],
    tags: [],
    author: ''
  };
  loadingEditor = signal(false);
  savingDraft = signal(false);

  getSourceName(src: any): string {
    if (typeof src === 'object' && src?.name) return src.name;
    if (typeof src === 'string') {
      try {
        const u = new URL(src);
        return u.hostname.replace('www.', '');
      } catch {
        return 'Fuente Externa';
      }
    }
    return 'Fuente';
  }

  getSourceUrl(src: any): string {
    if (typeof src === 'object' && src?.url) return src.url;
    if (typeof src === 'string') return src;
    return '#';
  }

  getSourceTitle(src: any): string {
    if (typeof src === 'object' && src?.title) return src.title;
    if (typeof src === 'string') return src;
    return 'Artículo consultado';
  }

  editingBlockId: string | null = null;
  aiPromptBlockId: string | null = null;
  aiInstructionText: string = '';
  loadingAiBlockId = signal<string | null>(null);

  aiImagePromptBlockId: string | null = null;
  aiImageInstructionText: string = '';
  loadingAiImage = signal<boolean>(false);

  aiCoverPromptOpen: boolean = false;
  aiCoverInstructionText: string = '';
  loadingAiCover = signal<boolean>(false);

  displayGlobalAiDialog = false;
  globalAiInstruction: string = '';
  loadingGlobalAi = signal(false);

  viewDrafts(schedule: NewsSchedule): void {
    this.selectedScheduleForDrafts = schedule;
    this.displayDraftsDialog = true;
    this.loadDrafts(schedule.id);
  }

  loadDrafts(scheduleId: string): void {
    this.loadingDrafts.set(true);
    this.schedulerService.getPendingDrafts(scheduleId).subscribe({
      next: (data) => {
        this.pendingDrafts.set(data);
        this.loadingDrafts.set(false);
      },
      error: (err) => {
        console.error('Error loading drafts', err);
        this.loadingDrafts.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los borradores.'
        });
      }
    });
  }

  openEditor(draft: any): void {
    this.displayEditorDialog = true;
    this.loadingEditor.set(true);
    this.editingBlockId = null;
    this.aiPromptBlockId = null;
    this.aiImagePromptBlockId = null;
    this.aiCoverPromptOpen = false;

    this.schedulerService.getDraftDetail(draft.id).subscribe({
      next: (detail: NewsDraftDetail) => {
        this.currentDraft = detail;
        this.currentArticleData = detail.articleData || {
          title: detail.title || 'Sin Título',
          subtitle: detail.subtitle || '',
          blocks: [],
          tags: [],
          author: 'Redacción Red+'
        };

        if (!this.currentArticleData.blocks) {
          this.currentArticleData.blocks = [];
        }
        this.loadingEditor.set(false);
      },
      error: (err) => {
        console.error('Error loading draft detail', err);
        this.loadingEditor.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar el detalle del borrador.'
        });
      }
    });
  }

  saveDraftChanges(notify: boolean = true): void {
    if (!this.currentDraft) return;

    this.savingDraft.set(true);
    this.schedulerService.updateDraft(this.currentDraft.id, this.currentArticleData).subscribe({
      next: () => {
        this.savingDraft.set(false);
        if (notify) {
          this.messageService.add({
            severity: 'success',
            summary: 'Guardado',
            detail: 'Los cambios en la noticia se han guardado en la base de datos.'
          });
        }
        if (this.selectedScheduleForDrafts) {
          this.loadDrafts(this.selectedScheduleForDrafts.id);
        }
      },
      error: (err) => {
        console.error('Error saving draft', err);
        this.savingDraft.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error al Guardar',
          detail: 'No se pudieron guardar los cambios en el borrador.'
        });
      }
    });
  }

  toggleEditBlock(blockId: string): void {
    this.editingBlockId = this.editingBlockId === blockId ? null : blockId;
  }

  toggleAiPrompt(blockId: string): void {
    if (this.aiPromptBlockId === blockId) {
      this.aiPromptBlockId = null;
      this.aiInstructionText = '';
    } else {
      this.aiPromptBlockId = blockId;
      this.aiInstructionText = '';
      this.editingBlockId = null;
    }
  }

  applyAiAdjustParagraph(block: NewsBlock): void {
    if (!this.currentDraft || !this.aiInstructionText.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atención',
        detail: 'Escribe una instrucción para la IA antes de aplicar.'
      });
      return;
    }

    this.loadingAiBlockId.set(block.id);
    this.schedulerService.aiAdjustParagraph(
      this.currentDraft.id,
      block.id,
      block.content || '',
      this.aiInstructionText
    ).subscribe({
      next: (res: any) => {
        block.content = res.adjustedText || res.plainText || block.content;
        this.loadingAiBlockId.set(null);
        this.aiPromptBlockId = null;
        this.aiInstructionText = '';
        this.saveDraftChanges(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Párrafo Ajustado con IA',
          detail: 'El párrafo se actualizó aplicando la instrucción solicitada.'
        });
      },
      error: (err) => {
        console.error('Error adjusting paragraph with AI', err);
        this.loadingAiBlockId.set(null);
        this.messageService.add({
          severity: 'error',
          summary: 'Error IA',
          detail: 'No se pudo procesar el ajuste del párrafo.'
        });
      }
    });
  }

  toggleAiImagePrompt(blockId: string): void {
    if (this.aiImagePromptBlockId === blockId) {
      this.aiImagePromptBlockId = null;
      this.aiImageInstructionText = '';
    } else {
      this.aiImagePromptBlockId = blockId;
      this.aiImageInstructionText = '';
    }
  }

  applyAiRegenerateImage(block: NewsBlock): void {
    if (!this.currentDraft || !this.aiImageInstructionText.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atención',
        detail: 'Escribe una instrucción o prompt para regenerar la imagen.'
      });
      return;
    }

    this.loadingAiImage.set(true);
    this.schedulerService.aiRegenerateImage(
      this.currentDraft.id,
      block.id,
      block.url || '',
      block.prompt || '',
      this.aiImageInstructionText
    ).subscribe({
      next: (res: any) => {
        if (res.newUrl) {
          block.url = res.newUrl;
        }
        if (res.prompt) {
          block.prompt = res.prompt;
        }
        if (res.caption) {
          block.caption = res.caption;
        }
        this.loadingAiImage.set(false);
        this.aiImagePromptBlockId = null;
        this.aiImageInstructionText = '';
        this.saveDraftChanges(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Imagen Regenerada con IA',
          detail: 'La imagen ha sido actualizada.'
        });
      },
      error: (err) => {
        console.error('Error regenerating image with AI', err);
        this.loadingAiImage.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error IA',
          detail: 'No se pudo regenerar la imagen.'
        });
      }
    });
  }

  toggleAiCoverPrompt(): void {
    this.aiCoverPromptOpen = !this.aiCoverPromptOpen;
    this.aiCoverInstructionText = '';
  }

  applyAiRegenerateCover(): void {
    if (!this.currentDraft || !this.aiCoverInstructionText.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atención',
        detail: 'Escribe una instrucción para regenerar la portada.'
      });
      return;
    }

    this.loadingAiCover.set(true);
    const currentCover = this.currentArticleData.coverImage;
    this.schedulerService.aiRegenerateImage(
      this.currentDraft.id,
      'cover',
      currentCover?.url || '',
      currentCover?.prompt || '',
      this.aiCoverInstructionText
    ).subscribe({
      next: (res: any) => {
        if (!this.currentArticleData.coverImage) {
          this.currentArticleData.coverImage = { url: '', alt: '', caption: '', prompt: '' };
        }
        if (res.newUrl) {
          this.currentArticleData.coverImage.url = res.newUrl;
        }
        if (res.prompt) {
          this.currentArticleData.coverImage.prompt = res.prompt;
        }
        if (res.caption) {
          this.currentArticleData.coverImage.caption = res.caption;
        }
        this.loadingAiCover.set(false);
        this.aiCoverPromptOpen = false;
        this.aiCoverInstructionText = '';
        this.saveDraftChanges(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Portada Regenerada',
          detail: 'La imagen de portada ha sido actualizada con IA.'
        });
      },
      error: (err) => {
        console.error('Error regenerating cover image', err);
        this.loadingAiCover.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error IA',
          detail: 'No se pudo regenerar la portada.'
        });
      }
    });
  }

  openGlobalAiDialog(): void {
    this.displayGlobalAiDialog = true;
    this.globalAiInstruction = '';
  }

  applyGlobalAi(): void {
    if (!this.currentDraft || !this.globalAiInstruction.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atención',
        detail: 'Escribe la instrucción global para la IA.'
      });
      return;
    }

    this.loadingGlobalAi.set(true);
    this.schedulerService.aiAdjustArticle(
      this.currentDraft.id,
      this.globalAiInstruction,
      this.currentArticleData
    ).subscribe({
      next: (res: any) => {
        if (res.adjustedArticle) {
          this.currentArticleData = res.adjustedArticle;
        }
        this.loadingGlobalAi.set(false);
        this.displayGlobalAiDialog = false;
        this.saveDraftChanges(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Ajuste Global Aplicado',
          detail: res.summary || 'Se aplicaron los ajustes globales a la noticia.'
        });
      },
      error: (err) => {
        console.error('Error applying global AI adjust', err);
        this.loadingGlobalAi.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error IA',
          detail: 'No se pudo aplicar el ajuste global.'
        });
      }
    });
  }

  addParagraphBlock(): void {
    const newBlock: NewsBlock = {
      id: 'block-' + Date.now(),
      type: 'paragraph',
      content: 'Escribe el contenido del nuevo párrafo aquí...'
    };
    this.currentArticleData.blocks.push(newBlock);
    this.editingBlockId = newBlock.id;
  }

  addImageBlock(): void {
    const newBlock: NewsBlock = {
      id: 'block-img-' + Date.now(),
      type: 'image',
      url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
      caption: 'Pie de foto de la nueva imagen.',
      alt: 'Imagen ilustrativa',
      prompt: 'Fotografía profesional sobre el tema'
    };
    this.currentArticleData.blocks.push(newBlock);
  }

  removeBlock(index: number): void {
    this.currentArticleData.blocks.splice(index, 1);
  }

  publishCurrentDraft(): void {
    if (!this.currentDraft) return;

    this.confirmationService.confirm({
      message: `¿Estás seguro de que deseas publicar definitivamente la noticia "${this.currentArticleData.title}" en el portal oficial?`,
      header: 'Confirmar Publicación Oficial',
      icon: 'alert-triangle',
      acceptLabel: 'Publicar Ahora',
      rejectLabel: 'Cancelar',
      accept: () => {

        this.schedulerService.updateDraft(this.currentDraft!.id, this.currentArticleData).subscribe({
          next: () => {
            this.schedulerService.publishDraft(this.currentDraft!.id).subscribe({
              next: () => {
                this.messageService.add({
                  severity: 'success',
                  summary: '¡Noticia Publicada!',
                  detail: 'La noticia se ha publicado correctamente en el portal oficial.'
                });
                this.displayEditorDialog = false;
                if (this.selectedScheduleForDrafts) {
                  this.loadDrafts(this.selectedScheduleForDrafts.id);
                }
                this.loadSchedules();
              },
              error: (err) => {
                console.error('Error publishing draft', err);
                this.messageService.add({
                  severity: 'error',
                  summary: 'Error al Publicar',
                  detail: 'No se pudo publicar la noticia.'
                });
              }
            });
          }
        });
      }
    });
  }

  publishDraft(draft: any): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de que deseas publicar definitivamente la noticia "${draft.title || draft.path}"?`,
      header: 'Confirmar Publicación',
      icon: 'alert-triangle',
      acceptLabel: 'Publicar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.schedulerService.publishDraft(draft.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Publicado',
              detail: 'La noticia se ha publicado correctamente.'
            });
            if (this.selectedScheduleForDrafts) {
              this.loadDrafts(this.selectedScheduleForDrafts.id);
            }
            this.loadSchedules();
          },
          error: (err) => {
            console.error('Error publishing draft', err);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo publicar la noticia.'
            });
          }
        });
      }
    });
  }

  confirmDeleteDraft(draft: any, event?: Event): void {
    if (draft.status === 'published') {
      this.messageService.add({
        severity: 'warn',
        summary: 'Acción no permitida',
        detail: 'No se pueden eliminar noticias que ya han sido publicadas.'
      });
      return;
    }

    this.confirmationService.confirm({
      target: event?.target as EventTarget,
      message: `¿Estás seguro de que deseas eliminar definitivamente el borrador "${draft.title || 'Sin Título'}"? Esta acción no se puede deshacer.`,
      header: 'Confirmar Eliminación de Borrador',
      icon: 'alert-triangle',
      acceptLabel: 'Sí, Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger p-button-sm',
      rejectButtonStyleClass: 'p-button-secondary p-button-text p-button-sm',
      accept: () => {
        this.schedulerService.deleteDraft(draft.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Borrador Eliminado',
              detail: 'El borrador ha sido eliminado definitivamente de la base de datos.'
            });
            if (this.selectedScheduleForDrafts) {
              this.loadDrafts(this.selectedScheduleForDrafts.id);
            }
            this.loadSchedules();
          },
          error: (err) => {
            console.error('Error deleting draft', err);
            this.messageService.add({
              severity: 'error',
              summary: 'Error al eliminar',
              detail: err?.error?.message || 'No se pudo eliminar el borrador.'
            });
          }
        });
      }
    });
  }
}

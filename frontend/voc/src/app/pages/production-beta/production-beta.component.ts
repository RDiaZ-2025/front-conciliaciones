import { LucideIconComponent } from '../../components/lucide-icon/lucide-icon.component';
import { CoreDialogService } from '../../services/core-dialog.service';
import { Component, inject, OnInit, OnDestroy, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of, firstValueFrom } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, take } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip'; // Or TagModule
import { TagModule } from 'primeng/tag';
import { MenuModule } from 'primeng/menu';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { BadgeModule } from 'primeng/badge';
import { DialogModule } from 'primeng/dialog';
import { RippleModule } from 'primeng/ripple';
import { DynamicDialogRef, DialogService } from 'primeng/dynamicdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { ProductionService } from '../../services/production.service';
import { AuthService } from '../../services/auth.service';
import { TeamService } from '../../services/team.service';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputNumberModule } from 'primeng/inputnumber';
import { FormsModule } from '@angular/forms';
import { ProductionRequest } from '../../models/common/production-request';
import { ProductionDialogComponent } from '../production_2/production-dialog/production-dialog.component';
import { ProductionDetailDialogComponent } from '../production_2/production-detail-dialog/production-detail-dialog.component';
import { StageTransitionUploadDialogComponent } from '../production_2/stage-transition-upload-dialog/stage-transition-upload-dialog.component';
import { AnsDialogComponent } from '../production_2/ans-dialog/ans-dialog.component';
import { HistoryDialog } from '../production_2/history-dialog/history-dialog.component';
import { AzureStorageService } from '../../services/azure-storage.service';
import { FilePreviewComponent } from '../../components/file-preview/file-preview.component';
import { UploadedFile } from '../../models/common/uploaded-file';
import { InSellActionDialogComponent } from '../production_2/in-sell-action-dialog/in-sell-action-dialog.component';
import { UploadDialogComponent } from '../production_2/upload-dialog/upload-dialog.component';
import { ConsecutiveDialogComponent } from '../production_2/consecutive-dialog/consecutive-dialog.component';
import { AssignImplementationDialogComponent } from '../production_2/assign-implementation-dialog/assign-implementation-dialog.component';
import { MaterialRegisterListDialogComponent } from '../production_2/material-register-list-dialog/material-register-list-dialog.component';

import { CustomerAutocompleteComponent } from '../../components/customer-autocomplete/customer-autocomplete.component';

@Component({
  selector: 'app-production-beta',
  standalone: true,
  imports: [
    LucideIconComponent,
    CommonModule,
    ButtonModule,
    CardModule,
    TagModule,
    MenuModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
    BadgeModule,
    DialogModule,
    RippleModule,
    ProgressSpinnerModule,
    FilePreviewComponent,
    PageHeaderComponent,
    AnsDialogComponent,
    CheckboxModule,
    InputTextModule,
    SelectModule,
    MultiSelectModule,
    InputNumberModule,
    FormsModule,
    CustomerAutocompleteComponent
  ],
  providers: [DialogService, ConfirmationService, MessageService],
  templateUrl: './production-beta.component.html',
  styleUrl: './production-beta.component.scss'
})
export class ProductionBetaComponent implements OnInit, OnDestroy {
  productionService = inject(ProductionService);
  teamService = inject(TeamService);
  dialogService = inject(CoreDialogService);
  confirmationService = inject(ConfirmationService);
  messageService = inject(MessageService);
  azureService = inject(AzureStorageService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  requests = signal<ProductionRequest[]>([]);
  dynamicSubmissions = signal<any[]>([]);
  sortedAllSubmissions = computed(() => {
    const all = [...this.dynamicSubmissions()];
    return all.sort((a, b) => {
      const aActive = a.status !== 'Completed' && a.status !== 'Approved';
      const bActive = b.status !== 'Completed' && b.status !== 'Approved';
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  });
  
  // Inbox Integration State
  pendingTasks = signal<any[]>([]);
  loadingTasks = signal<boolean>(false);
  showActionDialog = signal<boolean>(false);
  loadingAction = signal<boolean>(false);
  selectedTask = signal<any>(null);
  comments = signal<string>('');
  stageFormFields = signal<any[]>([]);
  stageFormValues: Record<string, string> = {};
  loadingStageFields = signal<boolean>(false);
  stageTempFiles: Record<string, File[]> = {};
  showConsecutiveDialog = signal<boolean>(false);
  consecutiveValue = '';

  loading = signal<boolean>(true);
  loading$ = toObservable(this.loading);

  // Preview state
  previewFile = signal<File | string | null>(null);
  previewVisible = signal<boolean>(false);
  isPreviewLoading = signal<boolean>(false);

  // SLA Rules state
  slaRulesVisible = signal<boolean>(false);

  // Historical View state
  showHistorical = signal<boolean>(false);
  showDetailsDialog = signal<boolean>(false);
  loadingDetails = signal<boolean>(false);
  selectedDetails = signal<any>(null);

  workflowStages: { id: string; label: string }[] = [];

  // Computed lists
  activeRequests = computed(() => this.requests().filter(r => r.stage !== 'completed'));
  historicalRequests = computed(() => this.requests().filter(r => r.stage === 'completed'));

  canViewHistory = computed(() => {
    const user = this.authService.currentUser();
    // Allow if user has 'production_management' permission (Area Head/Supervisor)
    // Or if user is an admin
    return user?.permissions?.some(p =>
      ['production_management', 'admin_panel'].includes(p.toLowerCase())
    ) ?? false;
  });

  canCreateRequest = computed(() => {
    const user = this.authService.currentUser();
    return user?.teamId === 6;
  });

  ref: DynamicDialogRef | undefined | null;

  // SLA Monitoring
  now = signal<Date>(new Date());
  private intervalId: any;
  private alertedRequests = new Set<number>(); // Track alerted requests to avoid spam

  // Local Logic State
  campaignTypeSelectionVisible = signal<boolean>(false);

  // Beta Wizard State
  showTypeSelectionDialog = signal<boolean>(false);
  loadingRequestTypes = signal<boolean>(false);
  requestTypes = signal<any[]>([]);
  selectedRequestTypes = signal<any[]>([]);
  parentFormGroups = signal<any[]>([]);
  detailsParentFormGroups = signal<any[]>([]);
  showFormDialog = signal<boolean>(false);
  currentFormIndex = signal<number>(0);
  currentFormFields = signal<any[]>([]);
  initialForms = signal<any[]>([]);
  selectedInitialFormId = signal<number | null>(null);
  selectedInitialForm = computed(() => this.initialForms().find(f => f.id === this.selectedInitialFormId()) || null);
  teams = signal<any[]>([]);
  initialFormFields = signal<any[]>([]);
  initialFormValues = signal<Record<string, string>>({});
  formValues: Record<string, string> = {};
  isProcessingMove = signal<boolean>(false);
  currentRequestProcessing: ProductionRequest | null = null;

  ngOnInit() {
    this.loadRequests();
    this.loadWorkflowStages();
    this.loadPendingTasks();

    // Handle deep linking
    this.route.queryParams.subscribe(params => {
      if (params['action'] === 'open' && params['requestName']) {
        this.handleDeepLink(params['requestName']);
      }
    });

    // Update time every minute
    this.intervalId = setInterval(() => {
      this.now.set(new Date());
      this.checkSLAAlerts();
    }, 60000);
  }

  handleDeepLink(requestName: string) {
    if (this.loading()) {
      this.loading$.pipe(
        filter(loading => !loading),
        take(1)
      ).subscribe(() => {
        this.findAndOpenRequest(requestName);
      });
    } else {
      this.findAndOpenRequest(requestName);
    }
  }

  findAndOpenRequest(name: string) {
    const request = this.requests().find(r => r.name === name);
    if (request) {
      this.openDialog(request);
      // Clear query params
      this.router.navigate([], {
        queryParams: { action: null, requestName: null },
        queryParamsHandling: 'merge'
      });
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'Solicitud no encontrada',
        detail: `No se encontró la solicitud "${name}".`
      });
    }
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  loadRequests() {
    this.loading.set(true);
    this.productionService.getDynamicSubmissions().subscribe({
      next: (subs) => {
        this.dynamicSubmissions.set(subs);
        this.loading.set(false);
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las solicitudes.' });
        this.loading.set(false);
      }
    });
  }

  loadWorkflowStages() {
    this.productionService.getWorkflowStages().subscribe({
      next: (stages) => {
        this.workflowStages = stages;
      },
      error: (error) => {
        console.error('Error loading workflow stages', error);
      }
    });
  }

  // ... (rest of the methods)

  getSLAStatus(deliveryDate?: string): 'success' | 'warn' | 'danger' {
    if (!deliveryDate) return 'success'; // No deadline, so technically "on time" or N/A

    const deadline = new Date(deliveryDate).getTime();
    const now = this.now().getTime();
    const diff = deadline - now;

    if (diff < 0) {
      return 'danger'; // Overdue
    } else if (diff < 24 * 60 * 60 * 1000) { // Less than 24 hours
      return 'warn'; // Approaching deadline
    } else {
      return 'success'; // On time
    }
  }

  getRemainingTime(deliveryDate?: string): string {
    if (!deliveryDate) return '';

    const deadline = new Date(deliveryDate).getTime();
    const now = this.now().getTime();
    let diff = deadline - now;
    const isOverdue = diff < 0;

    diff = Math.abs(diff);

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    let timeString = '';
    if (days > 0) timeString += `${days}d `;
    if (hours > 0) timeString += `${hours}h `;
    timeString += `${minutes}m`;

    return isOverdue ? `Vencido hace ${timeString}` : `${timeString} restantes`;
  }

  getTotalTime(request: ProductionRequest): string {
    if (!request.requestDate || !request.deliveryDate) return 'N/A';

    const start = new Date(request.requestDate).getTime();
    const end = new Date(request.deliveryDate).getTime();
    const diff = Math.abs(end - start);

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    let result = '';
    if (days > 0) result += `${days}d `;
    result += `${hours}h`;

    return result;
  }

  checkSLAAlerts() {
    const now = this.now().getTime();
    const twoHours = 2 * 60 * 60 * 1000;

    this.requests().forEach(request => {
      if (!request.deliveryDate || request.stage === 'completed' || this.alertedRequests.has(request.id)) return;

      const deadline = new Date(request.deliveryDate).getTime();
      const diff = deadline - now;

      // Trigger alert if within 2 hours and not overdue yet (or just about to be)
      if (diff > 0 && diff <= twoHours) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Atención: SLA Próximo',
          detail: `La solicitud "${request.name}" vence en menos de 2 horas.`,
          life: 5000
        });
        this.alertedRequests.add(request.id);
      }
    });
  }


  authService = inject(AuthService);

  openDialog(request?: ProductionRequest, readonly: boolean = false) {
    if (!request) {
      this.openBetaRequestWizard();
    } else {
      this.ref = this.dialogService.open(ProductionDetailDialogComponent, {
        header: readonly ? 'Detalles de Solicitud' : 'Editar Solicitud',
        width: '70%',
        contentStyle: { overflow: 'auto' },
        baseZIndex: 10000,
        maximizable: true,
        breakpoints: {
          '960px': '75vw',
          '640px': '90vw'
        },
        data: { id: request.id, readonly }
      });

      if (this.ref) {
        this.ref.onClose.subscribe((result: Partial<ProductionRequest>) => {
          if (result) {
            // Reload requests to ensure we have the latest data and correct status mapping
            this.loadRequests();
          }
        });
      }
    }
  }

  evaluateDefaultValueExpression(f: any): string {
    if (!f.defaultValueExpression) return '';
    
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const formattedDateTimeLocal = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const formattedDate = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
    const userName = this.authService.currentUser()?.name || '';
    const userEmail = this.authService.currentUser()?.email || '';

    let evaluated = f.defaultValueExpression;
    if (evaluated.includes('{{CURRENT_DATE_TIME}}')) {
      if (f.type === 'datetime') {
        evaluated = evaluated.replace(/\{\{CURRENT_DATE_TIME\}\}/g, formattedDateTimeLocal);
      } else if (f.type === 'date') {
        evaluated = evaluated.replace(/\{\{CURRENT_DATE_TIME\}\}/g, formattedDate);
      } else {
        const formattedDateTimeSpace = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
        evaluated = evaluated.replace(/\{\{CURRENT_DATE_TIME\}\}/g, formattedDateTimeSpace);
      }
    }
    if (evaluated.includes('{{LOGGED_USER_NAME}}')) {
      evaluated = evaluated.replace(/\{\{LOGGED_USER_NAME\}\}/g, userName);
    }
    if (evaluated.includes('{{LOGGED_USER_EMAIL}}')) {
      evaluated = evaluated.replace(/\{\{LOGGED_USER_EMAIL\}\}/g, userEmail);
    }
    if (evaluated.includes('{{LOGGED_USER_AREA}}')) {
      const userArea = this.authService.currentUser()?.teams?.[0] || '';
      evaluated = evaluated.replace(/\{\{LOGGED_USER_AREA\}\}/g, userArea);
    }
    return evaluated;
  }

  openBetaRequestWizard() {
    this.loadingRequestTypes.set(true);
    this.initialForms.set([]);
    this.initialFormValues.set({});
    this.dynamicListRows = {};
    this.selectedInitialFormId.set(null);

    this.productionService.getInitialForm().subscribe({
      next: (forms: any[]) => {
        const formsList = (Array.isArray(forms) ? forms : (forms ? [forms] : [])).map(f => ({
          ...f,
          disabled: !f.workflowId
        }));
        this.initialForms.set(formsList);
        const usableForms = formsList.filter(f => f.workflowId);
        if (usableForms.length === 1) {
          this.selectedInitialFormId.set(usableForms[0].id);
        }

        if (formsList.length > 0) {
          const fieldsObservables = formsList.map(form => 
            this.productionService.getDynamicFormFields(form.id)
          );
          
          forkJoin(fieldsObservables).subscribe({
            next: (allFieldsArray: any[][]) => {
              const vals: Record<string, string> = {};
              formsList.forEach((form, idx) => {
                const fields = allFieldsArray[idx] || [];
                fields.forEach((f: any) => {
                  if (f.metadata) {
                    if (typeof f.metadata === 'string') {
                      try { f.metadata = JSON.parse(f.metadata); } catch(e){}
                    }
                  } else {
                    f.metadata = {};
                  }
                  if (f.defaultValueExpression) {
                    vals[form.id + '_' + f.name] = this.evaluateDefaultValueExpression(f);
                  } else {
                    vals[form.id + '_' + f.name] = '';
                  }

                  if (f.type === 'dynamic_list') {
                    this.initDynamicListField(form.id + '_' + f.name, vals[form.id + '_' + f.name]);
                  }
                  if (f.type === 'multiselect') {
                    this.initMultiselectField(form.id + '_' + f.name, vals[form.id + '_' + f.name]);
                  }
                });
                form.fields = fields; // store fields inside form object
              });
              this.initialFormValues.set(vals);
              this.loadingRequestTypes.set(false);
            },
            error: (err) => {
              console.error('Error loading fields:', err);
              this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los campos de los formularios.' });
              this.loadingRequestTypes.set(false);
            }
          });
        } else {
          this.loadingRequestTypes.set(false);
        }
      },
      error: (err) => {
        console.error('Error loading initial forms:', err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la lista de formularios iniciales.' });
        this.loadingRequestTypes.set(false);
      }
    });

    this.teamService.getTeams().subscribe({
      next: (res) => {
        if (res.success) {
          this.teams.set((res.data || []).map((t: any) => {
            let defaultMode: 'leader' | 'random' | 'workflow' = 'leader';
            if (!t.leaderId && (!t.users || t.users.length === 0)) {
              defaultMode = 'workflow';
            } else if (!t.leaderId && t.users && t.users.length > 0) {
              defaultMode = 'random';
            }
            return {
              ...t,
              selected: false,
              assignmentMode: defaultMode
            };
          }));
        }
        this.showTypeSelectionDialog.set(true);
      },
      error: (err) => {
        console.error('Error loading teams:', err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los equipos.' });
        this.showTypeSelectionDialog.set(true);
      }
    });
  }

  async submitInitialRequest() {
    const formId = this.selectedInitialFormId();
    if (!formId) {
      this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'Debe seleccionar un Formulario de Solicitud Inicial.' });
      return;
    }
    const form = this.initialForms().find(f => f.id === formId);
    if (!form) return;

    if (!form.workflowId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Formulario Sin Flujo',
        detail: 'Este formulario no tiene un flujo de trabajo asociado y no puede ser enviado.'
      });
      return;
    }

    // Validate fields for selected initial form
    const values = this.initialFormValues();
    for (const field of (form.fields || [])) {
      if (field.isRequired && field.type !== 'section_header' && this.isFieldVisible(field, form.fields, values, form.id)) {
        if (field.type === 'file') {
          const files = this.getInitialSelectedFiles(form.id, field.name);
          if (files.length === 0) {
            this.messageService.add({ 
              severity: 'error', 
              summary: 'Error de Validación', 
              detail: `El campo "${field.label}" requiere cargar al menos un archivo.` 
            });
            return;
          }
        } else {
          const val = values[form.id + '_' + field.name];
          if (val === undefined || val === null || String(val).trim() === '') {
            this.messageService.add({ 
              severity: 'error', 
              summary: 'Error de Validación', 
              detail: `El campo "${field.label}" es obligatorio.` 
            });
            return;
          }
        }
      }
    }

    // Validate teams selected
    const selectedTeams = this.teams().filter(t => t.selected);
    if (selectedTeams.length === 0) {
      this.messageService.add({ 
        severity: 'warn', 
        summary: 'Atención', 
        detail: 'Debe seleccionar al menos un Equipo / Área destinataria para procesar la solicitud.' 
      });
      return;
    }

    this.loadingRequestTypes.set(true);

    // Upload files for initial form if any
    for (const field of (form.fields || [])) {
      if (field.type === 'file') {
        const fileKey = form.id + '_' + field.name;
        const filesToUpload = this.tempFiles[fileKey] || [];
        if (filesToUpload.length > 0) {
          const uploadResults = [];
          for (const file of filesToUpload) {
            const folderPath = `initial-submissions/form_${form.id}/${field.name}`;
            const res = await this.azureService.uploadFile(file, { containerName: 'private', folderPath });
            if (res.success) {
              uploadResults.push({ name: file.name, url: res.url });
            } else {
              this.messageService.add({ severity: 'error', summary: 'Error de carga', detail: `No se pudo subir el archivo: ${file.name}. ${res.error}` });
              this.loadingRequestTypes.set(false);
              return;
            }
          }
          values[fileKey] = JSON.stringify(uploadResults);
        }
      }
    }

    const targetTeams = selectedTeams.map(t => ({
      teamId: t.id,
      assignmentMode: t.assignmentMode || 'leader'
    }));
    const targetTeamIds = selectedTeams.map(t => t.id);

    // Build the submissions array payload
    const formValues: Record<string, string> = {};
    (form.fields || []).forEach((f: any) => {
      formValues[f.name] = values[form.id + '_' + f.name];
    });
    const submissions = [{ formId: form.id, values: formValues }];

    this.productionService.submitDynamicForm(form.id, formValues, undefined, submissions, targetTeamIds, targetTeams).subscribe({
      next: () => {
        this.showTypeSelectionDialog.set(false);
        this.messageService.add({ 
          severity: 'success', 
          summary: 'Éxito', 
          detail: 'Solicitud enviada exitosamente a los equipos seleccionados.' 
        });
        this.tempFiles = {}; // Clear temp files
        this.loadRequests(); // Reload list
        this.loadingRequestTypes.set(false);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo registrar la solicitud.' });
        this.loadingRequestTypes.set(false);
      }
    });
  }

  loadFormFieldsForIndex(index: number) {
    const currentForm = this.selectedRequestTypes()[index];
    if (!currentForm) return;

    this.loadingRequestTypes.set(true);
    this.productionService.getDynamicFormFields(currentForm.id).subscribe({
      next: (fields) => {
        const initialValues: Record<string, string> = {};
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        const formattedDate = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
        const userName = this.authService.currentUser()?.name || '';
        const userEmail = this.authService.currentUser()?.email || '';

        fields.forEach(f => {
          if (f.metadata && typeof f.metadata === 'string') {
            try { f.metadata = JSON.parse(f.metadata); } catch(e){}
          }
          if (f.defaultValueExpression) {
            initialValues[f.name] = this.evaluateDefaultValueExpression(f);
          } else {
            initialValues[f.name] = '';
          }

          if (f.type === 'dynamic_list') {
            this.initDynamicListField(f.name, initialValues[f.name]);
          }
          if (f.type === 'multiselect') {
            this.initMultiselectField(f.name, initialValues[f.name]);
          }
        });

        this.formValues = initialValues;
        this.currentFormFields.set(fields);
        this.loadingRequestTypes.set(false);
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los campos del formulario.' });
        this.loadingRequestTypes.set(false);
      }
    });
  }

  cancelTypeSelection() {
    this.showTypeSelectionDialog.set(false);
  }

  continueTypeSelection() {
    const selected = this.requestTypes().filter(t => t.selected);
    if (selected.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'Debe seleccionar al menos un tipo de solicitud.' });
      return;
    }
    this.selectedRequestTypes.set(selected);
    this.showTypeSelectionDialog.set(false);
    
    // Start form dialog flow
    this.currentFormIndex.set(0);
    this.loadFormFieldsForIndex(0);
    this.showFormDialog.set(true);
  }

  cancelFormFlow() {
    this.showFormDialog.set(false);
  }

  continueFormFlow() {
    const fields = this.currentFormFields();
    for (const field of fields) {
      if (field.isRequired && field.type !== 'section_header' && this.isFieldVisible(field, fields, this.formValues)) {
        if (field.type === 'file') {
          const files = this.getSelectedFiles(field.name);
          const val = this.formValues[field.name];
          const hasUploaded = this.getUploadedFiles(val).length > 0;
          if (files.length === 0 && !hasUploaded) {
            this.messageService.add({ 
              severity: 'error', 
              summary: 'Error de Validación', 
              detail: `El campo "${field.label}" requiere cargar al menos un archivo.` 
            });
            return;
          }
        } else {
          const val = this.formValues[field.name];
          if (val === undefined || val === null || String(val).trim() === '') {
            this.messageService.add({ 
              severity: 'error', 
              summary: 'Error de Validación', 
              detail: `El campo "${field.label}" es obligatorio.` 
            });
            return;
          }
        }
      }
    }

    const currentForm = this.selectedRequestTypes()[this.currentFormIndex()];
    this.uploadFilesAndSubmit(currentForm);
  }

  // --- File Uploader Helpers ---
  tempFiles: Record<string, File[]> = {};

  onFileSelected(event: any, field: any) {
    const files: FileList = event.target.files;
    if (!files || files.length === 0) return;

    const maxCount = field.metadata?.maxFileCount || 1;
    const maxMB = field.metadata?.maxFileSize || 10;
    const allowed = field.metadata?.allowedFormats ? field.metadata.allowedFormats.toLowerCase().split(',') : [];

    const currentList = this.tempFiles[field.name] || [];
    const newList = [...currentList];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Check count limit
      if (newList.length >= maxCount) {
        this.messageService.add({ severity: 'warn', summary: 'Límite excedido', detail: `Solo se permiten máximo ${maxCount} archivos en el campo "${field.label}".` });
        break;
      }

      // Check size limit
      if (file.size > maxMB * 1024 * 1024) {
        this.messageService.add({ severity: 'error', summary: 'Archivo muy grande', detail: `El archivo "${file.name}" supera el peso máximo permitido de ${maxMB}MB.` });
        continue;
      }

      // Check file formats
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (allowed.length > 0 && !allowed.includes(ext)) {
        this.messageService.add({ severity: 'error', summary: 'Formato no permitido', detail: `El formato de "${file.name}" no está permitido. Formatos aceptados: ${field.metadata.allowedFormats}.` });
        continue;
      }

      newList.push(file);
    }

    this.tempFiles[field.name] = newList;
    event.target.value = '';
  }

  getSelectedFiles(fieldName: string): File[] {
    return this.tempFiles[fieldName] || [];
  }

  removeSelectedFile(fieldName: string, index: number) {
    const current = this.tempFiles[fieldName] || [];
    current.splice(index, 1);
    this.tempFiles[fieldName] = current;
  }

  onInitialFileSelected(event: any, formId: number, field: any) {
    const files: FileList = event.target.files;
    if (!files || files.length === 0) return;

    const maxCount = field.metadata?.maxFileCount || 1;
    const maxMB = field.metadata?.maxFileSize || 10;
    const allowed = field.metadata?.allowedFormats ? field.metadata.allowedFormats.toLowerCase().split(',') : [];

    const fileKey = formId + '_' + field.name;
    const currentList = this.tempFiles[fileKey] || [];
    const newList = [...currentList];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (newList.length >= maxCount) {
        this.messageService.add({ severity: 'warn', summary: 'Límite excedido', detail: `Solo se permiten máximo ${maxCount} archivos en el campo "${field.label}".` });
        break;
      }

      if (file.size > maxMB * 1024 * 1024) {
        this.messageService.add({ severity: 'error', summary: 'Archivo muy grande', detail: `El archivo "${file.name}" supera el peso máximo permitido de ${maxMB}MB.` });
        continue;
      }

      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (allowed.length > 0 && !allowed.includes(ext)) {
        this.messageService.add({ severity: 'error', summary: 'Formato no permitido', detail: `El formato de "${file.name}" no está permitido. Formatos aceptados: ${field.metadata.allowedFormats}.` });
        continue;
      }

      newList.push(file);
    }

    this.tempFiles[fileKey] = newList;
    event.target.value = '';
  }

  getInitialSelectedFiles(formId: number, fieldName: string): File[] {
    return this.tempFiles[formId + '_' + fieldName] || [];
  }

  removeInitialSelectedFile(formId: number, fieldName: string, index: number) {
    const fileKey = formId + '_' + fieldName;
    const current = this.tempFiles[fileKey] || [];
    current.splice(index, 1);
    this.tempFiles[fileKey] = current;
  }

  getUploadedFiles(valueStr: string): any[] {
    if (!valueStr) return [];
    try {
      const parsed = JSON.parse(valueStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  downloadFormFile(file: any) {
    if (file && file.url) {
      window.open(file.url, '_blank');
    }
  }

  async uploadFilesAndSubmit(currentForm: any) {
    this.loadingRequestTypes.set(true);

    const fields = this.currentFormFields();
    // 1. Upload files
    for (const field of fields) {
      if (field.type === 'file') {
        const filesToUpload = this.tempFiles[field.name] || [];
        if (filesToUpload.length > 0) {
          const uploadResults = [];
          for (const file of filesToUpload) {
            const folderPath = `dynamic-submissions/temp_${Date.now()}/${field.name}`;
            const res = await this.azureService.uploadFile(file, { containerName: 'private', folderPath });
            if (res.success) {
              uploadResults.push({ name: file.name, url: res.url });
            } else {
              this.messageService.add({ severity: 'error', summary: 'Error de carga', detail: `No se pudo subir el archivo: ${file.name}. ${res.error}` });
              this.loadingRequestTypes.set(false);
              return;
            }
          }
          this.formValues[field.name] = JSON.stringify(uploadResults);
        }
      }
    }

    // 2. Submit the form
    this.productionService.submitDynamicForm(currentForm.id, this.formValues).subscribe({
      next: (res) => {
        this.tempFiles = {};
        this.loadingRequestTypes.set(false);
        const nextIndex = this.currentFormIndex() + 1;
        if (nextIndex < this.selectedRequestTypes().length) {
          this.currentFormIndex.set(nextIndex);
          this.loadFormFieldsForIndex(nextIndex);
        } else {
          this.showFormDialog.set(false);
          this.messageService.add({ 
            severity: 'success', 
            summary: 'Éxito', 
            detail: 'Formularios enviados y registrados en base de datos exitosamente.' 
          });
          this.loadRequests(); // Reload submissions list
        }
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar la solicitud.' });
        this.loadingRequestTypes.set(false);
      }
    });
  }

  getTypeIcon(name: string | undefined | null): string {
    if (!name) return 'tag';
    const n = name.toUpperCase();
    if (n.includes('CONTENT')) return 'edit';
    if (n.includes('DATA')) return 'database';
    if (n.includes('ESTRATEGIA')) return 'lightbulb';
    if (n.includes('IMPLEMENTACIÓN')) return 'rocket';
    if (n.includes('TRÁFICO')) return 'trending-up';
    return 'tag';
  }

  getFormIcon(item: any): string {
    if (item && item.icon) {
      return item.icon;
    }
    const name = item ? (item.name || item.formName) : '';
    return this.getTypeIcon(name);
  }

  getFormIconColor(item: any): string {
    const name = item ? (item.name || item.formName || '') : '';
    const n = name.toUpperCase();
    if (n.includes('CONTENT')) return 'text-orange-500';
    if (n.includes('DATA')) return 'text-blue-500';
    if (n.includes('ESTRATEGIA')) return 'text-yellow-500';
    if (n.includes('IMPLEMENTACIÓN')) return 'text-red-500';
    if (n.includes('TRÁFICO')) return 'text-green-500';
    if (n.includes('PRUEBA')) return 'text-cyan-500';
    return 'text-secondary';
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    if (!status) return 'secondary';
    const s = status.toLowerCase();
    if (s === 'approved' || s === 'completed') return 'success';
    if (s === 'in progress' || s === 'pending') return 'info';
    if (s === 'rejected') return 'danger';
    return 'secondary';
  }

  goToInbox() {
    this.router.navigate(['/requests-beta/inbox']);
  }

  goToAdmin() {
    this.router.navigate(['/requests-beta/admin']);
  }

  openHistory(request: ProductionRequest) {
    this.ref = this.dialogService.open(HistoryDialog, {
      header: `Historial de Cambios - ${request.name}`,
      width: '70%',
      contentStyle: { overflow: 'auto' },
      baseZIndex: 10000,
      maximizable: true,
      data: { id: request.id }
    });
  }

  openDetailDialog(request: ProductionRequest) {
    this.ref = this.dialogService.open(ProductionDetailDialogComponent, {
      header: 'Detalle de Solicitud',
      width: '50vw',
      contentStyle: { overflow: 'auto' },
      baseZIndex: 10000,
      maximizable: true,
      breakpoints: {
        '960px': '75vw',
        '640px': '90vw'
      },
      data: { request }
    });
  }

  openStageTransitionUploadDialog(request: ProductionRequest, nextStageId: string) {
    this.ref = this.dialogService.open(StageTransitionUploadDialogComponent, {
      header: 'Subir Archivos',
      width: '500px',
      contentStyle: { "overflow": "auto" },
      baseZIndex: 10000,
      data: { request, nextStageId }
    });

    if (this.ref) {
      this.ref.onClose.subscribe((result: any) => {
        if (result && result.success) {
          this.performMove(request, nextStageId);
        }
      });
    }
  }

  createRequest(request: Partial<ProductionRequest>) {
    this.productionService.createProductionRequest(request).subscribe({
      next: (newRequest) => {
        this.requests.update(current => [...current, newRequest]);
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Request created' });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to create request' });
      }
    });
  }

  updateRequest(id: number, request: Partial<ProductionRequest>) {
    this.productionService.updateProductionRequest(id, request).subscribe({
      next: (updatedRequest) => {
        this.requests.update(current => current.map(r => r.id === id ? updatedRequest : r));
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Request updated' });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update request' });
      }
    });
  }

  openUploadDialog(request: ProductionRequest) {
    this.ref = this.dialogService.open(UploadDialogComponent, {
      header: 'Carga de Documentos (Orden de Compra)',
      width: '70%',
      contentStyle: { overflow: 'auto' },
      baseZIndex: 10000,
      maximizable: true,
      data: { request }
    });

    if (this.ref) {
      this.ref.onClose.subscribe((result: any) => {
        if (result && result.success) {
          this.performMove(request, 'consecutive_generation');
        }
      });
    }
  }

  openConsecutiveDialog(request: ProductionRequest) {
    this.ref = this.dialogService.open(ConsecutiveDialogComponent, {
      header: 'Generar Consecutivo',
      width: '400px',
      contentStyle: { "overflow": "auto" },
      baseZIndex: 10000,
      data: { request }
    });

    if (this.ref) {
      this.ref.onClose.subscribe((result: any) => {
        if (result && result.consecutive) {
          this.performMove(request, 'closed_won', { consecutive: result.consecutive });
        }
      });
    }
  }

  openAssignImplementationDialog(request: ProductionRequest) {
    this.ref = this.dialogService.open(AssignImplementationDialogComponent, {
      header: 'Asignar Implementación',
      width: '400px',
      contentStyle: { "overflow": "auto" },
      baseZIndex: 10000,
      data: { request }
    });

    if (this.ref) {
      this.ref.onClose.subscribe((result: any) => {
        if (result) {
          this.performMove(request, 'implementation', {
            unitAssigned: result.unit,
            assignedUserId: result.assignedUser
          });
        }
      });
    }
  }

  openMaterialRegisterListDialog(request: ProductionRequest) {
    this.ref = this.dialogService.open(MaterialRegisterListDialogComponent, {
      header: 'Gestión de Materiales',
      width: '800px',
      contentStyle: { "overflow": "auto" },
      baseZIndex: 10000,
      data: { request }
    });

    if (this.ref) {
      this.ref.onClose.subscribe(() => {
        this.loadRequests();
      });
    }
  }

  moveRequest(request: ProductionRequest) {
    const currentStage = request.stage;
    let nextStageId = '';

    // Budget cleaning helper
    const getBudget = (req: ProductionRequest): number => {
      const budgetStr = String(req.campaignDetail?.budget || '0');
      const cleanBudget = budgetStr.replace(/[^0-9]/g, '');
      return parseFloat(cleanBudget);
    };

    switch (currentStage) {
      case 'request':
        // Skip quotation, go directly to in_sell or get_data based on budget
        const budget = getBudget(request);
        if (budget < 50000000) {
          nextStageId = 'get_data';
        } else {
          nextStageId = 'create_proposal';
        }
        break;

      case 'quotation':
        // Legacy path, just in case
        const budgetQ = getBudget(request);
        if (budgetQ < 50000000) {
          nextStageId = 'get_data';
        } else {
          nextStageId = 'create_proposal';
        }
        break;

      case 'create_proposal':
        this.openStageTransitionUploadDialog(request, 'get_data');
        return;

      case 'get_data': // formerly obtener_datos
        this.openStageTransitionUploadDialog(request, 'in_sell');
        return;


      case 'in_sell': // formerly venta
        this.ref = this.dialogService.open(InSellActionDialogComponent, {
          header: 'Confirmar Venta',
          width: '400px',
          contentStyle: { "overflow": "auto" },
          baseZIndex: 10000
        });

        if (this.ref) {
          this.ref.onClose.subscribe((result: any) => {
            if (result && result.action) {
              if (result.action === 'sold') {
                this.openUploadDialog(request);
              } else if (result.action === 'not_sold') {
                this.performMove(request, 'completed');
              }
              // 'cancel' or other results do nothing
            }
          });
        }
        return;

      case 'closed_won':
        this.confirmationService.confirm({
          message: '¿Estás seguro de continuar a la etapa de Implementación?',
          header: 'Confirmación',
          icon: 'alert-triangle',
          acceptLabel: 'Sí, continuar',
          rejectLabel: 'Cancelar',
          accept: () => {
            this.openAssignImplementationDialog(request);
          }
        });
        return;

      case 'consecutive_generation':
        this.openConsecutiveDialog(request);
        return;

      case 'material_preparation':
        // Left here for backward compatibility if any request is currently in this stage
        this.openAssignImplementationDialog(request);
        return;

      case 'implementation':
        this.openStageTransitionUploadDialog(request, 'customer_review');
        return;

      case 'customer_review':
        this.confirmationService.confirm({
          message: '¿Estás seguro de finalizar la solicitud y marcarla como completada?',
          header: 'Confirmación de Cierre',
          icon: 'check-circle',
          acceptLabel: 'Sí, finalizar',
          rejectLabel: 'Cancelar',
          accept: () => {
            this.performMove(request, 'completed');
          }
        });
        return;

      case 'val_materiales_mobile':
      case 'val_materiales_programatica':
      case 'val_materiales_red_plus':
        nextStageId = 'gestion_operativa';
        break;

      case 'gestion_operativa':
        nextStageId = 'cierre';
        break;

      case 'cierre':
        nextStageId = 'completed';
        break;

      case 'completed':
        return;

      default:
        // Fallback for any other stage
        const currentIndex = this.workflowStages.findIndex(s => s.id === request.stage);
        if (currentIndex !== -1 && currentIndex < this.workflowStages.length - 1) {
          nextStageId = String(this.workflowStages[currentIndex + 1].id);
        }
        break;
    }

    if (nextStageId) {
      this.performMove(request, nextStageId);
    }
  }

  selectCampaignType(stageId: string) {
    if (this.currentRequestProcessing) {
      this.performMove(this.currentRequestProcessing, stageId);
      this.campaignTypeSelectionVisible.set(false);
      this.currentRequestProcessing = null;
    }
  }

  performMove(request: ProductionRequest, nextStageId: string, data?: any) {
    this.isProcessingMove.set(true);
    this.productionService.moveRequest(request.id, nextStageId, data).subscribe({
      next: (updatedRequest) => {
        this.isProcessingMove.set(false);
        const stage = (typeof updatedRequest.status === 'string' ? updatedRequest.status : (updatedRequest.status as any)?.code) || updatedRequest.stage || 'request';
        const mappedRequest = { ...updatedRequest, stage };

        const nextStageLabel = this.getStageLabel(nextStageId);
        this.requests.update(current => current.map(r => r.id === request.id ? mappedRequest : r));
        this.messageService.add({ severity: 'success', summary: 'Success', detail: `Moved to ${nextStageLabel}` });
      },
      error: () => {
        this.isProcessingMove.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to move request' });
      }
    });
  }

  getStageLabel(stageId: string): string {
    return this.workflowStages.find(s => s.id === stageId)?.label || stageId;
  }

  // Method to get severity for Tag based on stage (optional but nice)
  getStageSeverity(stageId: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | undefined {
    switch (stageId) {
      case 'completed': return 'success';
      case 'cierre': return 'success';
      case 'customer_review': return 'info';
      case 'gestion_operativa': return 'contrast';
      case 'val_materiales_mobile':
      case 'val_materiales_programatica':
      case 'val_materiales_red_plus':
        return 'secondary';
      case 'implementation': return 'warn';
      case 'material_preparation': return 'warn';
      case 'consecutive_generation': return 'info';
      case 'venta': return 'info';
      case 'obtener_datos': return 'danger';
      case 'create_proposal': return 'warn';
      case 'quotation': return 'warn';
      case 'request': return 'secondary';
      default: return 'info';
    }
  }

  async downloadFile(fileId: string, fileName: string) {
    try {
      await this.azureService.downloadSingleFile(fileId, fileName);
      this.messageService.add({ severity: 'success', summary: 'Success', detail: 'File downloaded' });
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to download file' });
    }
  }

  async openPreview(file: UploadedFile) {
    this.isPreviewLoading.set(true);
    try {
      const blob = await this.azureService.getBlobData(file.id);
      const fileObj = new File([blob], file.name, { type: blob.type });
      this.previewFile.set(fileObj);
      this.previewVisible.set(true);
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la vista previa del archivo' });
    } finally {
      this.isPreviewLoading.set(false);
    }
  }

  downloadPreviewFile() {
    const file = this.previewFile();
    if (file instanceof File) {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
  }

  // --- Inbox Integration Logic ---
  loadPendingTasks() {
    this.loadingTasks.set(true);
    this.productionService.getPendingApprovals().subscribe({
      next: (data) => {
        this.pendingTasks.set(data);
        this.loadingTasks.set(false);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las aprobaciones pendientes.' });
        this.loadingTasks.set(false);
      }
    });
  }

  isCorrection(task: any): boolean {
    if (!task) return false;
    return task.submissionStatus === 'Rejected' && task.requesterUserId === this.authService.currentUser()?.id;
  }

  isPendingFormFill(task: any): boolean {
    if (!task) return false;
    return !!task.stageName?.startsWith('Llenar Formulario');
  }

  hasValue(val: any): boolean {
    if (val === undefined || val === null) return false;
    const s = String(val).trim();
    return s !== '' && s !== '[]' && s !== '""' && s !== 'null';
  }

  isSectionHeaderVisible(values: any[], currentIndex: number): boolean {
    if (!values || currentIndex < 0 || currentIndex >= values.length) return false;
    for (let i = currentIndex + 1; i < values.length; i++) {
      const nextVal = values[i];
      if (nextVal.fieldType === 'section_header') {
        return false;
      }
      if (this.hasValue(nextVal.value)) {
        return true;
      }
    }
    return false;
  }

  formatValue(val: any): string {
    if (!val || val.value === undefined || val.value === null) return '';
    const rawValue = String(val.value);
    if (val.fieldType === 'number' || val.fieldType === 'decimal') {
      const format = val.metadata?.numberFormat || 'none';
      if (format === 'none') return rawValue;
      const num = Number(rawValue);
      if (isNaN(num)) return rawValue;
      if (format === 'currency_cop') {
        return new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(num);
      }
      if (format === 'currency_usd') {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(num);
      }
      if (format === 'thousands_dot') {
        return new Intl.NumberFormat('de-DE', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(num);
      }
      if (format === 'thousands_comma') {
        return new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(num);
      }
    }
    return rawValue;
  }

  toNumber(val: any): number | null {
    if (val === undefined || val === null || String(val).trim() === '') return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  }

  setFormValue(key: string, val: any, type: 'initial' | 'stage' | 'parent') {
    const stringVal = val !== null && val !== undefined ? String(val) : '';
    if (type === 'initial') {
      const values = this.initialFormValues();
      values[key] = stringVal;
      this.initialFormValues.set({ ...values });
      this.recalculateInitialFormulas();
    } else if (type === 'stage') {
      this.stageFormValues[key] = stringVal;
      this.recalculateStageFormulas();
    } else if (type === 'parent') {
      this.stageFormValues[key] = stringVal;
      this.recalculateParentFormulas();
    }
  }

  openActionDialog(task: any) {
    console.log('Task selected in dashboard inbox:', task);
    this.selectedTask.set(task);
    this.comments.set('');
    this.stageFormFields.set([]);
    this.stageFormValues = {};
    this.showActionDialog.set(true);

    if (task && task.parentValues) {
      const groupsMap = new Map<string, any[]>();
      (task.parentValues || []).forEach((v: any) => {
        const formName = v.formName || 'Inicial';
        if (!groupsMap.has(formName)) {
          groupsMap.set(formName, []);
        }
        groupsMap.get(formName)!.push(v);
      });
      const groups = Array.from(groupsMap.entries()).map(([formName, values]) => ({
        formName,
        values
      }));
      this.parentFormGroups.set(groups);
    } else {
      this.parentFormGroups.set([]);
    }

    const isCorr = this.isCorrection(task);

    if (isCorr) {
      if (task && task.parentForms && task.parentForms.length > 0) {
        const initialValues: Record<string, string> = {};
        task.parentForms.forEach((form: any) => {
          form.fields.forEach((f: any) => {
            initialValues[form.formId + '_' + f.name] = f.value || '';
            if (f.type === 'dynamic_list') {
              this.initDynamicListField(form.formId + '_' + f.name, f.value || '');
            }
            if (f.type === 'multiselect') {
              this.initMultiselectField(form.formId + '_' + f.name, f.value || '');
            }
          });
        });
        this.stageFormValues = initialValues;
        this.stageFormFields.set([]);
        this.loadingStageFields.set(false);
      } else {
        this.loadingStageFields.set(true);
        this.productionService.getDynamicFormFields(task.formId).subscribe({
          next: (fields) => {
            const initialValues: Record<string, string> = {};
            fields.forEach(f => {
              if (f.metadata && typeof f.metadata === 'string') {
                try { f.metadata = JSON.parse(f.metadata); } catch(e){}
              }
              const val = task.submittedValuesRaw[f.name] || '';
              initialValues[f.name] = val;
              if (f.type === 'dynamic_list') {
                this.initDynamicListField(f.name, val);
              }
              if (f.type === 'multiselect') {
                this.initMultiselectField(f.name, val);
              }
            });
            this.stageFormValues = initialValues;
            this.stageFormFields.set(fields);
            this.loadingStageFields.set(false);
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los campos del formulario original.' });
            this.loadingStageFields.set(false);
          }
        });
      }
    } else if (task.formIdToFill === -1) {
      this.loadingStageFields.set(false);
      this.stageFormFields.set([]);
      this.selectedMultiFormIds.set([]);
      const initialValues: Record<string, string> = {};
      if (task.availableMultiForms && task.availableMultiForms.length > 0) {
        task.availableMultiForms.forEach((frm: any) => {
          (frm.fields || []).forEach((f: any) => {
            const key = frm.formId + '_' + f.name;
            if (f.defaultValueExpression) {
              initialValues[key] = this.evaluateDefaultValueExpression(f);
            } else {
              initialValues[key] = '';
            }
            if (f.type === 'dynamic_list') {
              this.initDynamicListField(key, initialValues[key]);
            }
            if (f.type === 'multiselect') {
              this.initMultiselectField(key, initialValues[key]);
            }
          });
        });
      }
      this.stageFormValues = initialValues;
    } else if (task.formIdToFill) {
      this.loadingStageFields.set(true);
      this.productionService.getDynamicFormFields(task.formIdToFill).subscribe({
        next: (fields) => {
          const initialValues: Record<string, string> = {};
          const now = new Date();
          const pad = (n: number) => n.toString().padStart(2, '0');
          const formattedDate = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
          const userName = this.authService.currentUser()?.name || '';
          const userEmail = this.authService.currentUser()?.email || '';

          fields.forEach(f => {
            if (f.metadata && typeof f.metadata === 'string') {
              try { f.metadata = JSON.parse(f.metadata); } catch(e){}
            }
            if (f.defaultValueExpression) {
              initialValues[f.name] = this.evaluateDefaultValueExpression(f);
            } else {
              initialValues[f.name] = '';
            }

            if (f.type === 'dynamic_list') {
              this.initDynamicListField(f.name, initialValues[f.name]);
            }
            if (f.type === 'multiselect') {
              this.initMultiselectField(f.name, initialValues[f.name]);
            }
          });

          this.stageFormValues = initialValues;
          this.stageFormFields.set(fields);
          this.loadingStageFields.set(false);
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los campos requeridos para esta etapa.' });
          this.loadingStageFields.set(false);
        }
      });
    }
  }

  selectedMultiFormIds = signal<number[]>([]);

  isMultiFormSelected(formId: number): boolean {
    return this.selectedMultiFormIds().includes(formId);
  }

  toggleMultiFormSelection(formId: number) {
    const current = this.selectedMultiFormIds();
    if (current.includes(formId)) {
      this.selectedMultiFormIds.set(current.filter(id => id !== formId));
    } else {
      this.selectedMultiFormIds.set([...current, formId]);
    }
  }

  getSelectedMultiForms(): any[] {
    const task = this.selectedTask();
    if (!task || !task.availableMultiForms) return [];
    return task.availableMultiForms.filter((f: any) => this.selectedMultiFormIds().includes(f.formId));
  }

  processAction(action: 'approve' | 'reject') {
    const task = this.selectedTask();
    const notes = this.comments();
    const isCorr = this.isCorrection(task);

    if (action === 'reject' && (!notes || !notes.trim())) {
      this.messageService.add({ severity: 'error', summary: 'Validación', detail: 'Debe ingresar un comentario para justificar el rechazo.' });
      return;
    }

    if (action === 'approve' && task?.requireCommentOnApprove && (!notes || !notes.trim())) {
      this.messageService.add({ severity: 'error', summary: 'Validación', detail: 'Debe ingresar un comentario para aprobar esta etapa.' });
      return;
    }

    if (action === 'approve') {
      if (task.formIdToFill === -1) {
        if (this.selectedMultiFormIds().length === 0) {
          this.messageService.add({
            severity: 'error',
            summary: 'Validación',
            detail: 'Debe seleccionar al menos un formulario para diligenciar en esta etapa.'
          });
          return;
        }
        const selectedForms = this.getSelectedMultiForms();
        for (const frm of selectedForms) {
          for (const field of frm.fields) {
            if (field.isRequired && field.type !== 'section_header' && this.isFieldVisible(field, frm.fields, this.stageFormValues, frm.formId)) {
              const key = frm.formId + '_' + field.name;
              if (field.type === 'file') {
                const files = this.getStageSelectedFiles(key);
                const val = this.stageFormValues[key];
                const hasUploaded = this.getStageUploadedFiles(val).length > 0;
                if (files.length === 0 && !hasUploaded) {
                  this.messageService.add({
                    severity: 'error',
                    summary: 'Validación',
                    detail: `En "${frm.formName}", el campo "${field.label}" requiere cargar al menos un archivo.`
                  });
                  return;
                }
              } else {
                const val = this.stageFormValues[key];
                if (val === undefined || val === null || String(val).trim() === '') {
                  this.messageService.add({
                    severity: 'error',
                    summary: 'Validación',
                    detail: `En "${frm.formName}", el campo "${field.label}" es requerido.`
                  });
                  return;
                }
              }
            }
          }
        }
      } else if (task.formIdToFill || isCorr) {
        const fields = this.stageFormFields();
        for (const field of fields) {
          if (field.isRequired && field.type !== 'section_header' && this.isFieldVisible(field, fields, this.stageFormValues)) {
            if (field.type === 'file') {
              const files = this.getStageSelectedFiles(field.name);
              const val = this.stageFormValues[field.name];
              const hasUploaded = this.getStageUploadedFiles(val).length > 0;
              if (files.length === 0 && !hasUploaded) {
                this.messageService.add({ 
                  severity: 'error', 
                  summary: 'Validación', 
                  detail: `El campo "${field.label}" requiere cargar al menos un archivo.` 
                });
                return;
              }
            } else {
              const val = this.stageFormValues[field.name];
              if (val === undefined || val === null || String(val).trim() === '') {
                this.messageService.add({ 
                  severity: 'error', 
                  summary: 'Validación', 
                  detail: `El campo "${field.label}" es requerido para continuar.` 
                });
                return;
              }
            }
          }
        }
      }
    }

    if (action === 'reject') {
      this.loadingAction.set(true);
      this.productionService.actionApproval(task.stateId, action, notes, undefined).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Solicitud rechazada/devuelta.' });
          this.showActionDialog.set(false);
          this.loadPendingTasks();
          this.loadRequests();
          this.loadingAction.set(false);
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Ocurrió un error al procesar la acción.' });
          this.loadingAction.set(false);
        }
      });
    } else {
      this.uploadStageFilesAndAction(task, action, notes);
    }
  }

  onStageFileSelected(event: any, field: any) {
    const files: FileList = event.target.files;
    if (!files || files.length === 0) return;

    const maxCount = field.metadata?.maxFileCount || 1;
    const maxMB = field.metadata?.maxFileSize || 10;
    const allowed = field.metadata?.allowedFormats ? field.metadata.allowedFormats.toLowerCase().split(',') : [];

    const currentList = this.stageTempFiles[field.name] || [];
    const newList = [...currentList];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (newList.length >= maxCount) {
        this.messageService.add({ severity: 'warn', summary: 'Límite excedido', detail: `Solo se permiten máximo ${maxCount} archivos en el campo "${field.label}".` });
        break;
      }

      if (file.size > maxMB * 1024 * 1024) {
        this.messageService.add({ severity: 'error', summary: 'Archivo muy grande', detail: `El archivo "${file.name}" supera el peso máximo permitido de ${maxMB}MB.` });
        continue;
      }

      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (allowed.length > 0 && !allowed.includes(ext)) {
        this.messageService.add({ severity: 'error', summary: 'Formato no permitido', detail: `El formato de "${file.name}" no está permitido. Formatos aceptados: ${field.metadata.allowedFormats}.` });
        continue;
      }

      newList.push(file);
    }

    this.stageTempFiles[field.name] = newList;
    event.target.value = '';
  }

  onParentFileSelected(event: any, formId: number, field: any) {
    const files: FileList = event.target.files;
    if (!files || files.length === 0) return;

    const maxCount = field.metadata?.maxFileCount || 1;
    const maxMB = field.metadata?.maxFileSize || 10;
    const allowed = field.metadata?.allowedFormats ? field.metadata.allowedFormats.toLowerCase().split(',') : [];

    const fileKey = formId + '_' + field.name;
    const currentList = this.stageTempFiles[fileKey] || [];
    const newList = [...currentList];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (newList.length >= maxCount) {
        this.messageService.add({ severity: 'warn', summary: 'Límite excedido', detail: `Solo se permiten máximo ${maxCount} archivos en el campo "${field.label}".` });
        break;
      }

      if (file.size > maxMB * 1024 * 1024) {
        this.messageService.add({ severity: 'error', summary: 'Archivo muy grande', detail: `El archivo "${file.name}" supera el peso máximo permitido de ${maxMB}MB.` });
        continue;
      }

      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (allowed.length > 0 && !allowed.includes(ext)) {
        this.messageService.add({ severity: 'error', summary: 'Formato no permitido', detail: `El formato de "${file.name}" no está permitido. Formatos aceptados: ${field.metadata.allowedFormats}.` });
        continue;
      }

      newList.push(file);
    }

    this.stageTempFiles[fileKey] = newList;
    event.target.value = '';
  }

  getStageSelectedFiles(fieldName: string): File[] {
    return this.stageTempFiles[fieldName] || [];
  }

  removeStageSelectedFile(fieldName: string, index: number) {
    const current = this.stageTempFiles[fieldName] || [];
    current.splice(index, 1);
    this.stageTempFiles[fieldName] = current;
  }

  getStageUploadedFiles(valueStr: string): any[] {
    if (!valueStr) return [];
    try {
      const parsed = JSON.parse(valueStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  downloadStageFormFile(file: any) {
    if (file && file.url) {
      window.open(file.url, '_blank');
    }
  }

  isFileListValue(value: string): boolean {
    if (!value) return false;
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) && parsed.length > 0 && parsed[0].url !== undefined;
    } catch(e) {
      return false;
    }
  }

  async uploadStageFilesAndAction(task: any, action: 'approve' | 'reject', notes: string) {
    this.loadingAction.set(true);

    const fields = this.stageFormFields();
    for (const field of fields) {
      if (field.type === 'file') {
        const filesToUpload = this.stageTempFiles[field.name] || [];
        if (filesToUpload.length > 0) {
          const uploadResults = [];
          for (const file of filesToUpload) {
            const folderPath = `dynamic-submissions/task_${task.stateId}/${field.name}`;
            const res = await this.azureService.uploadFile(file, { containerName: 'private', folderPath });
            if (res.success) {
              uploadResults.push({ name: file.name, url: res.url });
            } else {
              this.messageService.add({ severity: 'error', summary: 'Error de carga', detail: `No se pudo subir el archivo: ${file.name}. ${res.error}` });
              this.loadingAction.set(false);
              return;
            }
          }
          this.stageFormValues[field.name] = JSON.stringify(uploadResults);
        }
      }
    }

    // 1.5. Upload files from parent correction forms if any
    const parentForms = task.parentForms || [];
    for (const form of parentForms) {
      for (const field of form.fields) {
        if (field.type === 'file') {
          const fileKey = form.formId + '_' + field.name;
          const filesToUpload = this.stageTempFiles[fileKey] || [];
          if (filesToUpload.length > 0) {
            const uploadResults = [];
            for (const file of filesToUpload) {
              const folderPath = `dynamic-submissions/task_${task.stateId}/${field.name}`;
              const res = await this.azureService.uploadFile(file, { containerName: 'private', folderPath });
              if (res.success) {
                uploadResults.push({ name: file.name, url: res.url });
              } else {
                this.messageService.add({ severity: 'error', summary: 'Error de carga', detail: `No se pudo subir el archivo: ${file.name}. ${res.error}` });
                this.loadingAction.set(false);
                return;
              }
            }
            this.stageFormValues[fileKey] = JSON.stringify(uploadResults);
          }
        }
      }
    }

    // 1.8. Upload files from multi forms if any
    if (task.formIdToFill === -1 && this.getSelectedMultiForms().length > 0) {
      for (const mForm of this.getSelectedMultiForms()) {
        for (const field of mForm.fields) {
          if (field.type === 'file') {
            const fileKey = mForm.formId + '_' + field.name;
            const filesToUpload = this.stageTempFiles[fileKey] || [];
            if (filesToUpload.length > 0) {
              const uploadResults = [];
              for (const file of filesToUpload) {
                const folderPath = `dynamic-submissions/task_${task.stateId}/${field.name}`;
                const res = await this.azureService.uploadFile(file, { containerName: 'private', folderPath });
                if (res.success) {
                  uploadResults.push({ name: file.name, url: res.url });
                } else {
                  this.messageService.add({ severity: 'error', summary: 'Error de carga', detail: `No se pudo subir el archivo: ${file.name}. ${res.error}` });
                  this.loadingAction.set(false);
                  return;
                }
              }
              this.stageFormValues[fileKey] = JSON.stringify(uploadResults);
            }
          }
        }
      }
    }

    this.productionService.actionApproval(task.stateId, action, notes, action === 'approve' ? this.stageFormValues : undefined).subscribe({
      next: (res) => {
        this.stageTempFiles = {};
        this.showActionDialog.set(false);
        this.loadPendingTasks();
        this.loadRequests();
        this.loadingAction.set(false);

        if (action === 'approve' && res && res.status === 'Pending Consecutive') {
          this.messageService.add({
            severity: 'info',
            summary: 'Aprobación Registrada',
            detail: 'La solicitud ha sido aprobada. Ahora ingrese el consecutivo para completarla.'
          });
          this.consecutiveValue = '';
          this.showConsecutiveDialog.set(true);
        } else {
          this.messageService.add({ 
            severity: 'success', 
            summary: 'Éxito', 
            detail: action === 'approve' ? (this.isCorrection(task) ? 'Corrección enviada con éxito.' : 'Solicitud aprobada con éxito.') : 'Solicitud rechazada/devuelta.' 
          });
        }
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Ocurrió un error al procesar la acción.' });
        this.loadingAction.set(false);
      }
    });
  }

  openConsecutiveDialogDirectly(task: any) {
    this.selectedTask.set(task);
    this.consecutiveValue = '';
    this.showConsecutiveDialog.set(true);
  }

  submitConsecutiveOnly() {
    const task = this.selectedTask();
    const val = this.consecutiveValue;
    if (!val || !val.trim()) {
      this.messageService.add({ severity: 'error', summary: 'Validación', detail: 'Debe ingresar el número de consecutivo.' });
      return;
    }

    this.loadingAction.set(true);
    this.productionService.actionApproval(task.stateId, 'approve', 'Consecutivo ingresado', undefined, val).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Consecutivo guardado y flujo completado.' });
        this.showConsecutiveDialog.set(false);
        this.loadRequests();
        this.loadPendingTasks();
        this.loadingAction.set(false);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el consecutivo.' });
        this.loadingAction.set(false);
      }
    });
  }

  viewSubmissionDetails(submissionId: number) {
    this.selectedDetails.set(null);
    this.detailsParentFormGroups.set([]);
    this.loadingDetails.set(true);
    this.showDetailsDialog.set(true);

    this.productionService.getSubmissionDetails(submissionId).subscribe({
      next: (data) => {
        this.selectedDetails.set(data);
        if (data && data.parentValues && data.parentValues.length > 0) {
          const groupsMap = new Map<string, any[]>();
          (data.parentValues || []).forEach((v: any) => {
            const formName = v.formName || 'Inicial';
            if (!groupsMap.has(formName)) {
              groupsMap.set(formName, []);
            }
            groupsMap.get(formName)!.push(v);
          });
          const groups = Array.from(groupsMap.entries()).map(([formName, values]) => ({
            formName,
            values
          }));
          this.detailsParentFormGroups.set(groups);
        } else {
          this.detailsParentFormGroups.set([]);
        }
        this.loadingDetails.set(false);
      },
      error: () => {
        this.loadingDetails.set(false);
        this.showDetailsDialog.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los detalles de la solicitud.' });
      }
    });
  }

  evaluateFormula(formula: string, values: Record<string, string>, rounding: number = 2): number {
    try {
      if (!formula) return 0;
      let sanitized = formula;
      const keys = Object.keys(values).sort((a, b) => b.length - a.length);
      for (const key of keys) {
        const val = parseFloat(values[key]) || 0;
        sanitized = sanitized.split(key).join(String(val));
      }
      sanitized = sanitized.split('^').join('**');
      let safetyCheck = sanitized;
      const allowedMath = ['Math.abs', 'Math.round', 'Math.ceil', 'Math.floor', 'Math.sqrt', 'Math.pow', 'Math.max', 'Math.min'];
      for (const m of allowedMath) {
        safetyCheck = safetyCheck.split(m).join('');
      }
      safetyCheck = safetyCheck.replace(/[0-9.+\-*/%() \s]/g, '');
      if (safetyCheck.length > 0) {
        console.warn('Unsafe characters detected in evaluated formula:', safetyCheck);
        return 0;
      }
      const result = Function('"use strict"; return (' + sanitized + ')')();
      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        const factor = Math.pow(10, rounding);
        return Math.round(result * factor) / factor;
      }
      return 0;
    } catch (e) {
      console.error('Error evaluating formula:', e);
      return 0;
    }
  }

  recalculateInitialFormulas() {
    const forms = this.initialForms();
    const values = this.initialFormValues();
    let changed = false;
    for (const form of forms) {
      for (const field of form.fields) {
        if (field.type === 'formula') {
          const key = form.id + '_' + field.name;
          const formula = field.metadata?.formula || '';
          const rounding = field.metadata?.formulaRounding ?? 2;
          const labelValues: Record<string, string> = {};
          form.fields.forEach((f: any) => {
            if (f.name !== field.name) {
              labelValues[f.label] = values[form.id + '_' + f.name] || '';
            }
          });
          const result = this.evaluateFormula(formula, labelValues, rounding);
          const resultStr = String(result);
          if (values[key] !== resultStr) {
            values[key] = resultStr;
            changed = true;
          }
        }
      }
    }
    if (changed) {
      this.initialFormValues.set({ ...values });
    }

    // Validate teams selected options against enabling conditions
    const currentTeams = this.teams();
    let teamsChanged = false;
    for (const t of currentTeams) {
      if (t.selected && !this.isTeamEnabled(t)) {
        t.selected = false;
        teamsChanged = true;
      }
    }
    if (teamsChanged) {
      this.teams.set([...currentTeams]);
    }
  }

  recalculateStageFormulas() {
    const fields = this.stageFormFields();
    const values = this.stageFormValues;
    let changed = false;
    for (const field of fields) {
      if (field.type === 'formula') {
        const formula = field.metadata?.formula || '';
        const rounding = field.metadata?.formulaRounding ?? 2;
        const labelValues: Record<string, string> = {};
        fields.forEach((f: any) => {
          if (f.name !== field.name) {
            labelValues[f.label] = values[f.name] || '';
          }
        });
        const result = this.evaluateFormula(formula, labelValues, rounding);
        const resultStr = String(result);
        if (values[field.name] !== resultStr) {
          values[field.name] = resultStr;
          changed = true;
        }
      }
    }
  }

  recalculateParentFormulas() {
    const task = this.selectedTask();
    if (!task || !task.parentForms) return;
    const values = this.stageFormValues;
    for (const form of task.parentForms) {
      for (const field of form.fields) {
        if (field.type === 'formula') {
          const key = form.formId + '_' + field.name;
          const formula = field.metadata?.formula || '';
          const rounding = field.metadata?.formulaRounding ?? 2;
          const labelValues: Record<string, string> = {};
          form.fields.forEach((f: any) => {
            if (f.name !== field.name) {
              labelValues[f.label] = values[form.formId + '_' + f.name] || '';
            }
          });
          const result = this.evaluateFormula(formula, labelValues, rounding);
          values[key] = String(result);
        }
      }
    }
  }

  dynamicListSelected: Record<string, string[]> = {};
  dynamicListRows: Record<string, any[]> = {};
  multiselectSelected: Record<string, string[]> = {};

  initMultiselectField(key: string, rawVal: string) {
    if (rawVal) {
      try {
        const parsed = JSON.parse(rawVal);
        if (Array.isArray(parsed)) {
          this.multiselectSelected[key] = parsed;
          return;
        }
      } catch(e){}
      if (rawVal.trim()) {
        this.multiselectSelected[key] = rawVal.split(',').map(s => s.trim()).filter(Boolean);
        return;
      }
    }
    this.multiselectSelected[key] = [];
  }

  onMultiselectSelectionChange(key: string, selectedOptions: string[], containerType: 'initial' | 'stage') {
    this.multiselectSelected[key] = selectedOptions || [];
    const valStr = JSON.stringify(this.multiselectSelected[key]);
    if (containerType === 'initial') {
      const vals = this.initialFormValues();
      vals[key] = valStr;
      this.initialFormValues.set({ ...vals });
      this.recalculateInitialFormulas();
    } else {
      this.stageFormValues[key] = valStr;
      if (key.includes('_')) {
        this.recalculateParentFormulas();
      } else {
        this.recalculateStageFormulas();
      }
    }
  }

  isFieldVisible(field: any, allFields: any[], formValues: Record<string, any>, formId?: number): boolean {
    if (!field) return false;
    
    const dependency = field.metadata?.dependency;
    if (!dependency || !dependency.fieldName) {
      return true;
    }

    const parentName = dependency.fieldName;
    const parentKey = formId ? `${formId}_${parentName}` : parentName;
    const parentValue = formValues[parentKey];

    if (parentValue === undefined || parentValue === null || parentValue === '') {
      return false;
    }

    const parentField = allFields.find(f => f.name === parentName);
    const requiredVal = dependency.value;

    if (parentField && (parentField.type === 'multiselect' || parentField.type === 'dynamic_list')) {
      let selectedList: string[] = [];
      try {
        const parsed = JSON.parse(parentValue);
        if (Array.isArray(parsed)) {
          selectedList = parsed.map(i => typeof i === 'object' ? (i.item || i.product) : i).filter(Boolean);
        }
      } catch(e) {
        selectedList = String(parentValue).split(',').map(s => s.trim()).filter(Boolean);
      }

      if (Array.isArray(requiredVal)) {
        return requiredVal.some(val => selectedList.includes(val));
      }
      return selectedList.includes(requiredVal);
    }

    if (Array.isArray(requiredVal)) {
      return requiredVal.includes(String(parentValue));
    }
    return String(parentValue) === String(requiredVal);
  }

  initDynamicListField(key: string, rawVal: string) {
    if (!this.dynamicListRows[key]) {
      this.dynamicListRows[key] = [];
    }
    if (rawVal) {
      try {
        const parsed = JSON.parse(rawVal);
        if (Array.isArray(parsed)) {
          this.dynamicListRows[key] = parsed;
          this.dynamicListSelected[key] = parsed.map(i => i.item || i.product).filter(Boolean);
          return;
        }
      } catch(e){}
    }
    this.dynamicListRows[key] = [];
    this.dynamicListSelected[key] = [];
  }

  onDynamicListSelectionChange(key: string, selectedOptions: string[], field: any, containerType: 'initial' | 'stage') {
    this.dynamicListSelected[key] = selectedOptions || [];
    if (!this.dynamicListRows[key]) {
      this.dynamicListRows[key] = [];
    }
    const currentList = this.dynamicListRows[key];
    const subFields = field?.metadata?.subFields && field.metadata.subFields.length > 0
      ? field.metadata.subFields
      : [{ name: 'quantity', label: 'Cantidad', type: 'number' }];

    const newList = (selectedOptions || []).map(opt => {
      const existing = currentList.find(i => (i.item || i.product) === opt);
      if (existing) return existing;
      const itemObj: Record<string, any> = { item: opt };
      subFields.forEach((sf: any) => {
        itemObj[sf.name] = (sf.type === 'number' || sf.type === 'decimal') ? 1 : '';
      });
      return itemObj;
    });

    this.dynamicListRows[key] = newList;
    
    const jsonVal = JSON.stringify(newList);
    if (containerType === 'initial') {
      const vals = this.initialFormValues();
      vals[key] = jsonVal;
      this.initialFormValues.set({ ...vals });
      this.recalculateInitialFormulas();
    } else {
      this.stageFormValues[key] = jsonVal;
      this.recalculateStageFormulas();
    }
  }

  updateDynamicListItemValue(key: string, itemIdx: number, subFieldName: string, newVal: any, containerType: 'initial' | 'stage') {
    const list = this.dynamicListRows[key] || [];
    if (list[itemIdx]) {
      list[itemIdx][subFieldName] = newVal;
      const jsonVal = JSON.stringify(list);
      if (containerType === 'initial') {
        const vals = this.initialFormValues();
        vals[key] = jsonVal;
        this.initialFormValues.set({ ...vals });
        this.recalculateInitialFormulas();
      } else {
        this.stageFormValues[key] = jsonVal;
        this.recalculateStageFormulas();
      }
    }
  }

  removeDynamicListItem(key: string, itemIdx: number, containerType: 'initial' | 'stage') {
    const list = this.dynamicListRows[key] || [];
    const removedItem = list[itemIdx];
    list.splice(itemIdx, 1);
    
    if (removedItem) {
      const name = removedItem.item || removedItem.product;
      this.dynamicListSelected[key] = (this.dynamicListSelected[key] || []).filter(i => i !== name);
    }

    const jsonVal = JSON.stringify(list);
    if (containerType === 'initial') {
      const vals = this.initialFormValues();
      vals[key] = jsonVal;
      this.initialFormValues.set({ ...vals });
      this.recalculateInitialFormulas();
    } else {
      this.stageFormValues[key] = jsonVal;
      this.recalculateStageFormulas();
    }
  }

  isDynamicListValue(val: any): boolean {
    if (typeof val !== 'string' || !val.trim().startsWith('[')) return false;
    try {
      const parsed = this.parseDynamicList(val);
      return parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0] !== null && ('item' in parsed[0] || 'product' in parsed[0]);
    } catch {
      return false;
    }
  }

  private parsedListCache = new Map<string, any[]>();
  parseDynamicList(val: any): any[] {
    if (!val || typeof val !== 'string') return [];
    if (this.parsedListCache.has(val)) {
      return this.parsedListCache.get(val)!;
    }
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        this.parsedListCache.set(val, parsed);
        return parsed;
      }
    } catch {}
    return [];
  }

  getDynamicListKeys(item: any): string[] {
    if (!item || typeof item !== 'object') return [];
    return Object.keys(item).filter(k => k !== 'item' && k !== 'product');
  }

  formatLabel(key: string): string {
    return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  isAreaEnabled(item: any): boolean {
    return this.isTeamEnabled(item);
  }

  hasTeamMembers(team: any): boolean {
    if (!team) return false;
    if (team.leaderId || team.leader) return true;
    if (Array.isArray(team.users) && team.users.length > 0) return true;
    return false;
  }

  cycleTeamAssignmentMode(team: any, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    const currentMode = team.assignmentMode || 'leader';
    let nextMode: 'leader' | 'random' | 'workflow' = 'leader';
    if (currentMode === 'leader') {
      nextMode = 'random';
    } else if (currentMode === 'random') {
      nextMode = 'workflow';
    } else {
      nextMode = 'leader';
    }
    team.assignmentMode = nextMode;
  }

  getTeamAssignmentBadge(team: any): { label: string; icon: string; severity: 'info' | 'success' | 'warn' | 'danger' | 'secondary' | 'contrast'; tooltip: string; bgClass: string; textClass: string; borderClass: string } {
    const mode = team.assignmentMode || 'leader';
    if (mode === 'leader') {
      if (team.leader) {
        return {
          label: `Líder: ${team.leader.name}`,
          icon: 'user-check',
          severity: 'info',
          tooltip: `Asignar a Líder: La etapa 1 se asignará a ${team.leader.name}. Haz clic para alternar modo.`,
          bgClass: 'bg-blue-50',
          textClass: 'text-blue-700',
          borderClass: 'border-blue-200'
        };
      } else {
        return {
          label: 'Líder (Sin asignar)',
          icon: 'user-check',
          severity: 'warn',
          tooltip: 'Asignar a Líder: Este equipo no tiene líder asignado (se intentará miembro aleatorio o flujo). Haz clic para alternar modo.',
          bgClass: 'bg-amber-50',
          textClass: 'text-amber-800',
          borderClass: 'border-amber-200'
        };
      }
    } else if (mode === 'random') {
      const count = team.users?.length || 0;
      return {
        label: `Aleatorio (${count} miembros)`,
        icon: 'shuffle',
        severity: 'success',
        tooltip: `Asignación Aleatoria: La etapa 1 se asignará al azar entre los ${count} miembros del equipo. Haz clic para alternar modo.`,
        bgClass: 'bg-purple-50',
        textClass: 'text-purple-700',
        borderClass: 'border-purple-200'
      };
    } else {
      return {
        label: 'Según Flujo (Etapa 1)',
        icon: 'git-branch',
        severity: 'warn',
        tooltip: 'Asignación según Flujo: La etapa 1 se asignará según la regla configurada en la Etapa 1 del Flujo de Trabajo. Haz clic para alternar modo.',
        bgClass: 'bg-orange-50',
        textClass: 'text-orange-800',
        borderClass: 'border-orange-200'
      };
    }
  }

  getTeamDisabledReason(team: any): string | undefined {
    if (!this.isTeamConditionMet(team)) {
      return 'No cumple con las condiciones configuradas en el formulario inicial.';
    }
    return undefined;
  }

  isTeamEnabled(team: any): boolean {
    return this.isTeamConditionMet(team);
  }

  isTeamConditionMet(item: any): boolean {
    if (!item) return false;
    let meta = item.metadata;
    if (meta && typeof meta === 'string') {
      try { meta = JSON.parse(meta); } catch(e) {}
    }
    if (!meta || !meta.enableConditions || !Array.isArray(meta.enableConditions) || meta.enableConditions.length === 0) {
      return true;
    }

    const values = this.initialFormValues();
    const removeAccents = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Check all conditions (AND logic)
    for (const cond of meta.enableConditions) {
      let val: any = undefined;
      const keys = cond.fieldKeys || (cond.fieldKey ? [cond.fieldKey] : []);
      for (const key of keys) {
        if (values[key] !== undefined && values[key] !== null && values[key] !== '') {
          val = values[key];
          break;
        }
        // Also check with selected initial form prefix
        const formId = this.selectedInitialFormId();
        if (formId && values[`${formId}_${key}`] !== undefined && values[`${formId}_${key}`] !== null && values[`${formId}_${key}`] !== '') {
          val = values[`${formId}_${key}`];
          break;
        }
        // Check cleanKey without form prefix
        const cleanKey = key.includes('_') ? key.split('_').slice(1).join('_') : key;
        if (formId && values[`${formId}_${cleanKey}`] !== undefined && values[`${formId}_${cleanKey}`] !== null && values[`${formId}_${cleanKey}`] !== '') {
          val = values[`${formId}_${cleanKey}`];
          break;
        }
      }

      const op = cond.operator || 'contains';
      const condVal = cond.value;

      if (op === 'is_empty') {
        if (val !== undefined && val !== null && String(val).trim() !== '' && String(val) !== '[]') {
          return false;
        }
        continue;
      }

      if (op === 'is_not_empty') {
        if (val === undefined || val === null || String(val).trim() === '' || String(val) === '[]') {
          return false;
        }
        continue;
      }

      if (val === undefined || val === null || val === '') {
        return false;
      }

      // Extract cond values array
      let condValuesArray: string[] = [];
      if (Array.isArray(condVal)) {
        condValuesArray = condVal.map(v => removeAccents(String(v)).toLowerCase().trim());
      } else if (typeof condVal === 'string' && condVal.startsWith('[') && condVal.endsWith(']')) {
        try {
          const parsed = JSON.parse(condVal);
          condValuesArray = Array.isArray(parsed) ? parsed.map(v => removeAccents(String(v)).toLowerCase().trim()) : [removeAccents(String(condVal)).toLowerCase().trim()];
        } catch(e) {
          condValuesArray = [removeAccents(String(condVal)).toLowerCase().trim()];
        }
      } else if (condVal !== undefined && condVal !== null) {
        condValuesArray = [removeAccents(String(condVal)).toLowerCase().trim()];
      }

      // Extract user values array
      let userValuesArray: string[] = [];
      if (Array.isArray(val)) {
        userValuesArray = val.map(v => typeof v === 'object' && v !== null ? (v.item || v.product || v.name || JSON.stringify(v)) : String(v));
      } else if (typeof val === 'string' && val.startsWith('[') && val.endsWith(']')) {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) {
            userValuesArray = parsed.map(v => typeof v === 'object' && v !== null ? (v.item || v.product || v.name || JSON.stringify(v)) : String(v));
          } else {
            userValuesArray = [val];
          }
        } catch(e) {
          userValuesArray = [val];
        }
      } else {
        userValuesArray = [String(val)];
      }
      userValuesArray = userValuesArray.map(v => removeAccents(String(v)).toLowerCase().trim());

      if (op === 'contains') {
        const matches = condValuesArray.some(cv => userValuesArray.some(uv => uv.includes(cv)));
        if (!matches) {
          return false;
        }
      } else if (op === 'eq') {
        const matches = condValuesArray.some(cv => userValuesArray.includes(cv));
        if (!matches) {
          return false;
        }
      } else if (op === 'neq') {
        const matches = condValuesArray.some(cv => userValuesArray.includes(cv));
        if (matches) {
          return false;
        }
      } else if (op === 'gt') {
        const numVal = Number(String(val).replace(/[^0-9.-]/g, ''));
        const numCond = Number(condVal);
        if (isNaN(numVal) || numVal <= numCond) {
          return false;
        }
      } else if (op === 'lt') {
        const numVal = Number(String(val).replace(/[^0-9.-]/g, ''));
        const numCond = Number(condVal);
        if (isNaN(numVal) || numVal >= numCond) {
          return false;
        }
      } else if (op === 'gte') {
        const numVal = Number(String(val).replace(/[^0-9.-]/g, ''));
        const numCond = Number(condVal);
        if (isNaN(numVal) || numVal < numCond) {
          return false;
        }
      } else if (op === 'lte') {
        const numVal = Number(String(val).replace(/[^0-9.-]/g, ''));
        const numCond = Number(condVal);
        if (isNaN(numVal) || numVal > numCond) {
          return false;
        }
      }
    }

    return true;
  }

  getDisplayInitialValues(item: any): any[] {
    if (!item) return [];
    if (item.parentValues && item.parentValues.length > 0) {
      return item.parentValues;
    }
    return item.values || [];
  }
}

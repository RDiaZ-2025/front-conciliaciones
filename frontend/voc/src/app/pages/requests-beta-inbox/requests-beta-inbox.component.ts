import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { LucideIconComponent } from '../../components/lucide-icon/lucide-icon.component';
import { ProductionService } from '../../services/production.service';
import { AuthService } from '../../services/auth.service';
import { AzureStorageService } from '../../services/azure-storage.service';
import { CustomerAutocompleteComponent } from '../../components/customer-autocomplete/customer-autocomplete.component';

@Component({
  selector: 'app-requests-beta-inbox',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    DialogModule,
    InputTextModule,
    CheckboxModule,
    SelectModule,
    MultiSelectModule,
    InputNumberModule,
    ToastModule,
    TooltipModule,
    TagModule,
    ProgressSpinnerModule,
    PageHeaderComponent,
    LucideIconComponent,
    CustomerAutocompleteComponent
  ],
  templateUrl: './requests-beta-inbox.component.html',
  styleUrls: ['./requests-beta-inbox.component.css'],
  providers: [MessageService]
})
export class RequestsBetaInboxComponent implements OnInit {
  private productionService = inject(ProductionService);
  private authService = inject(AuthService);
  private messageService = inject(MessageService);
  private azureService = inject(AzureStorageService);

  pendingTasks = signal<any[]>([]);
  loadingTasks = signal<boolean>(false);

  showActionDialog = signal<boolean>(false);
  loadingAction = signal<boolean>(false);
  selectedTask = signal<any>(null);
  parentFormGroups = signal<any[]>([]);
  comments = signal<string>('');
  chosenNextAssignee: any = null;

  submissions = signal<any[]>([]);
  filteredSubmissions = computed(() => {
    const pendingSubmissionIds = new Set<number>();
    (this.pendingTasks() || []).forEach(t => {
      if (t.submissionId) pendingSubmissionIds.add(t.submissionId);
      if (t.parentSubmissionId) pendingSubmissionIds.add(t.parentSubmissionId);
    });

    const all = (this.submissions() || []).filter(s => {
      if (pendingSubmissionIds.has(s.id)) return false;
      if (s.parentSubmissionId && pendingSubmissionIds.has(s.parentSubmissionId)) return false;
      return true;
    });

    return all.sort((a, b) => {
      const aActive = a.status !== 'Completed' && a.status !== 'Approved';
      const bActive = b.status !== 'Completed' && b.status !== 'Approved';
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  });
  loadingSubmissions = signal<boolean>(false);
  showDetailsDialog = signal<boolean>(false);
  loadingDetails = signal<boolean>(false);
  selectedDetails = signal<any>(null);
  detailsParentFormGroups = signal<any[]>([]);

  stageFormFields = signal<any[]>([]);
  stageFormValues: Record<string, string> = {};
  loadingStageFields = signal<boolean>(false);

  ngOnInit() {
    this.loadPendingTasks();
    this.loadSubmissions();
  }

  loadSubmissions() {
    this.loadingSubmissions.set(true);
    this.productionService.getDynamicSubmissions().subscribe({
      next: (data: any[]) => {
        this.submissions.set(data);
        this.loadingSubmissions.set(false);
      },
      error: () => {
        this.loadingSubmissions.set(false);
      }
    });
  }

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
    return task.submissionStatus === 'Rejected';
  }

  isPendingFormFill(task: any): boolean {
    if (!task) return false;
    return !!task.stageName?.startsWith('Llenar Formulario');
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

    } else if (type === 'stage') {
      this.stageFormValues[key] = stringVal;
      this.recalculateStageFormulas();
    } else if (type === 'parent') {
      this.stageFormValues[key] = stringVal;
      this.recalculateParentFormulas();
    }
  }

  openActionDialog(task: any) {
    console.log('Task selected in inbox:', task);
    this.selectedTask.set(task);
    this.comments.set('');
    this.chosenNextAssignee = null;
    if (task?.allowChooseNextStageAssignee && task?.nextStageAssigneeOptions?.length === 1) {
      this.chosenNextAssignee = task.nextStageAssigneeOptions[0];
    }
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
      this.recalculateParentFormulas();
    } else if (task.formIdToFill === -1) {
      this.loadingStageFields.set(false);
      this.stageFormFields.set([]);
      this.selectedMultiFormIds.set([]);
      const initialValues: Record<string, string> = {};
      if (task.availableMultiForms && task.availableMultiForms.length > 0) {
        task.availableMultiForms.forEach((frm: any) => {
          (frm.fields || []).forEach((f: any) => {
            const key = frm.formId + '_' + f.name;
            const prevVal = task.submittedValuesRaw ? (task.submittedValuesRaw[f.name] ?? '') : '';
            if (prevVal !== '') {
              initialValues[key] = prevVal;
            } else if (f.defaultValueExpression) {
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
          fields.forEach(f => {
            if (f.metadata && typeof f.metadata === 'string') {
              try { f.metadata = JSON.parse(f.metadata); } catch(e){}
            }
            const prevVal = task.submittedValuesRaw ? (task.submittedValuesRaw[f.name] ?? '') : '';
            if (prevVal !== '') {
              initialValues[f.name] = prevVal;
            } else if (f.defaultValueExpression) {
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
          this.recalculateStageFormulas();
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

  isMultiFormDisabled(formId: number): boolean {
    const task = this.selectedTask();
    if (!task) return false;
    const max = task.maxSelectedForms;
    if (!max || max <= 0) return false;
    const isSelected = this.isMultiFormSelected(formId);
    if (isSelected) return false;
    return this.selectedMultiFormIds().length >= max;
  }

  toggleMultiFormSelection(formId: number) {
    const current = this.selectedMultiFormIds();
    if (current.includes(formId)) {
      this.selectedMultiFormIds.set(current.filter(id => id !== formId));
    } else {
      const task = this.selectedTask();
      const max = task?.maxSelectedForms;
      if (max && max > 0 && current.length >= max) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Límite de selección',
          detail: `Solo puedes seleccionar un máximo de ${max} opción(es) en esta etapa.`
        });
        return;
      }
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

    if (action === 'approve' && !isCorr && task?.requireCommentOnApprove && (!notes || !notes.trim())) {
      this.messageService.add({ severity: 'error', summary: 'Validación', detail: 'Debe ingresar un comentario para aprobar esta etapa.' });
      return;
    }

    if (action === 'approve') {
      if (task.parentForms && task.parentForms.length > 0) {
        for (const frm of task.parentForms) {
          for (const field of frm.fields) {
            if (field.isRequired && field.type !== 'section_header' && this.isFieldVisible(field, frm.fields, this.stageFormValues, frm.formId)) {
              const key = frm.formId + '_' + field.name;
              if (field.type === 'file') {
                const files = this.getSelectedFiles(key);
                const val = this.stageFormValues[key];
                const hasUploaded = this.getUploadedFiles(val).length > 0;
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
      } else if (task.formIdToFill === -1) {
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
                const files = this.getSelectedFiles(key);
                const val = this.stageFormValues[key];
                const hasUploaded = this.getUploadedFiles(val).length > 0;
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
      } else if (task.formIdToFill) {
        const fields = this.stageFormFields();
        for (const field of fields) {
          if (field.isRequired && field.type !== 'section_header' && this.isFieldVisible(field, fields, this.stageFormValues)) {
            if (field.type === 'file') {
              const files = this.getSelectedFiles(field.name);
              const val = this.stageFormValues[field.name];
              const hasUploaded = this.getUploadedFiles(val).length > 0;
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

    if (action === 'approve' && !this.isCorrection(task) && task.allowChooseNextStageAssignee && task.nextStageAssigneeOptions?.length > 0 && !task.isFinalStage) {
      if (!this.chosenNextAssignee) {
        this.messageService.add({
          severity: 'error',
          summary: 'Validación',
          detail: 'Debes seleccionar a quién se le asignará la siguiente etapa.'
        });
        return;
      }
    }

    if (action === 'reject') {
      this.loadingAction.set(true);
      this.productionService.actionApproval(task.stateId, action, notes, undefined).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Solicitud rechazada/devuelta.' });
          this.showActionDialog.set(false);
          this.loadPendingTasks();
          this.loadingAction.set(false);
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Ocurrió un error al procesar la acción.' });
          this.loadingAction.set(false);
        }
      });
    } else {
      this.uploadFilesAndAction(task, action, notes);
    }
  }

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

    this.tempFiles[field.name] = newList;
    event.target.value = '';
  }

  onParentFileSelected(event: any, formId: number, field: any) {
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

  getSelectedFiles(fieldName: string): File[] {
    return this.tempFiles[fieldName] || [];
  }

  removeSelectedFile(fieldName: string, index: number) {
    const current = this.tempFiles[fieldName] || [];
    current.splice(index, 1);
    this.tempFiles[fieldName] = current;
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

  isFileListValue(value: string): boolean {
    if (!value) return false;
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) && parsed.length > 0 && parsed[0].url !== undefined;
    } catch(e) {
      return false;
    }
  }

  async uploadFilesAndAction(task: any, action: 'approve' | 'reject', notes: string) {
    this.loadingAction.set(true);

    const fields = this.stageFormFields();

    for (const field of fields) {
      if (field.type === 'file') {
        const filesToUpload = this.tempFiles[field.name] || [];
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

    const parentForms = task.parentForms || [];
    for (const form of parentForms) {
      for (const field of form.fields) {
        if (field.type === 'file') {
          const fileKey = form.formId + '_' + field.name;
          const filesToUpload = this.tempFiles[fileKey] || [];
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

    if (task.formIdToFill === -1 && this.getSelectedMultiForms().length > 0) {
      for (const mForm of this.getSelectedMultiForms()) {
        for (const field of mForm.fields) {
          if (field.type === 'file') {
            const fileKey = mForm.formId + '_' + field.name;
            const filesToUpload = this.tempFiles[fileKey] || [];
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

    this.productionService.actionApproval(
      task.stateId,
      action,
      notes,
      action === 'approve' ? this.stageFormValues : undefined,
      undefined,
      action === 'approve' ? this.chosenNextAssignee : undefined
    ).subscribe({
      next: (res) => {
        this.tempFiles = {};
        this.chosenNextAssignee = null;
        this.showActionDialog.set(false);
        this.loadPendingTasks();
        this.loadingAction.set(false);

        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: action === 'approve' ? (this.isCorrection(task) ? 'Corrección enviada con éxito.' : 'Solicitud aprobada con éxito.') : 'Solicitud rechazada/devuelta.'
        });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Ocurrió un error al procesar la acción.' });
        this.loadingAction.set(false);
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

  onMultiselectSelectionChange(key: string, selectedOptions: string[], valuesContainer: Record<string, any>) {
    this.multiselectSelected[key] = selectedOptions || [];
    valuesContainer[key] = JSON.stringify(this.multiselectSelected[key]);
    if (key.includes('_')) {
      this.recalculateParentFormulas();
    } else {
      this.recalculateStageFormulas();
    }
  }

  parseNumericValue(val: any): number {
    if (typeof val === 'number') return isNaN(val) ? NaN : val;
    if (val === undefined || val === null) return NaN;
    let str = String(val).trim().replace(/[^0-9.,-]/g, '');
    if (!str) return NaN;

    if (str.includes('.') && str.includes(',')) {
      const lastDot = str.lastIndexOf('.');
      const lastComma = str.lastIndexOf(',');
      if (lastComma > lastDot) {
        str = str.replace(/\./g, '').replace(',', '.');
      } else {
        str = str.replace(/,/g, '');
      }
    } else if ((str.match(/\./g) || []).length > 1) {
      str = str.replace(/\./g, '');
    } else if ((str.match(/,/g) || []).length > 1) {
      str = str.replace(/,/g, '');
    } else if (str.includes(',')) {
      const parts = str.split(',');
      if (parts[1] && parts[1].length === 3 && parts[0].length <= 3) {
        str = str.replace(',', '');
      } else {
        str = str.replace(',', '.');
      }
    }
    const n = Number(str);
    return isNaN(n) ? NaN : n;
  }

  isFieldVisible(field: any, allFields: any[], formValues: Record<string, any>, formId?: number): boolean {
    if (!field) return false;
    if (field.isActive === false) return false;

    const dependency = field.metadata?.dependency;
    if (!dependency || !dependency.fieldName) {
      return true;
    }

    const parentName = dependency.fieldName;
    const parentKey = formId ? `${formId}_${parentName}` : parentName;
    let parentValue = formValues ? formValues[parentKey] : undefined;
    if (parentValue === undefined && formValues && formId) {
      parentValue = formValues[parentName];
    }
    if (parentValue === undefined && formValues && !formId) {
      const matchKey = Object.keys(formValues).find(k => k === parentName || k.endsWith(`_${parentName}`));
      if (matchKey) {
        parentValue = formValues[matchKey];
      }
    }

    let op = dependency.operator;
    const requiredVal = dependency.value;

    if (!op) {
      if (typeof requiredVal === 'string') {
        const trimmed = requiredVal.trim();
        if (trimmed.startsWith('>=')) op = 'gte';
        else if (trimmed.startsWith('>')) op = 'gt';
        else if (trimmed.startsWith('<=')) op = 'lte';
        else if (trimmed.startsWith('<')) op = 'lt';
        else if (trimmed.startsWith('!=')) op = 'neq';
        else op = 'eq';
      } else {
        op = 'eq';
      }
    }

    if (op === 'is_empty') {
      return parentValue === undefined || parentValue === null || String(parentValue).trim() === '' || String(parentValue) === '[]';
    }

    if (op === 'is_not_empty') {
      return parentValue !== undefined && parentValue !== null && String(parentValue).trim() !== '' && String(parentValue) !== '[]';
    }

    if (parentValue === undefined || parentValue === null || String(parentValue).trim() === '') {
      return false;
    }

    if (['gt', 'gte', 'lt', 'lte'].includes(op)) {
      const numParent = this.parseNumericValue(parentValue);
      const numTarget = this.parseNumericValue(requiredVal);
      if (isNaN(numParent) || isNaN(numTarget)) {
        return false;
      }
      if (op === 'gt') return numParent > numTarget;
      if (op === 'gte') return numParent >= numTarget;
      if (op === 'lt') return numParent < numTarget;
      if (op === 'lte') return numParent <= numTarget;
    }

    const parentField = allFields ? allFields.find(f => f.name === parentName) : null;

    if (parentField && (parentField.type === 'multiselect' || parentField.type === 'dynamic_list')) {
      let selectedList: string[] = [];
      try {
        const parsed = typeof parentValue === 'string' ? JSON.parse(parentValue) : parentValue;
        if (Array.isArray(parsed)) {
          selectedList = parsed.map(i => typeof i === 'object' && i !== null ? (i.item || i.product || i.name || i.value || JSON.stringify(i)) : String(i)).filter(Boolean);
        } else {
          selectedList = [String(parentValue)];
        }
      } catch(e) {
        selectedList = String(parentValue).split(',').map(s => s.trim()).filter(Boolean);
      }

      const cleanReqList = Array.isArray(requiredVal) 
        ? requiredVal.map(v => String(v).trim()).filter(v => v && v !== 'null' && v !== '_null')
        : (requiredVal !== undefined && requiredVal !== null ? [String(requiredVal).trim()] : []);

      if (op === 'neq') {
        return !cleanReqList.some(val => selectedList.includes(val));
      }
      return cleanReqList.some(val => selectedList.includes(val));
    }

    const parentStr = String(parentValue).trim().toLowerCase();

    if (Array.isArray(requiredVal)) {
      const cleanReq = requiredVal
        .map(v => String(v).trim().toLowerCase())
        .filter(v => v && v !== 'null' && v !== '_null');
      if (op === 'neq') {
        return !cleanReq.includes(parentStr);
      }
      if (op === 'contains') {
        return cleanReq.some(val => parentStr.includes(val));
      }
      return cleanReq.includes(parentStr);
    }

    const targetStr = String(requiredVal ?? '').trim().toLowerCase();
    if (op === 'neq') {
      return parentStr !== targetStr;
    }
    if (op === 'contains') {
      return parentStr.includes(targetStr);
    }
    return parentStr === targetStr;
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

  onDynamicListSelectionChange(key: string, selectedOptions: string[], field: any, valuesContainer: Record<string, any>) {
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
    valuesContainer[key] = jsonVal;
    if (key.includes('_')) {
      this.recalculateParentFormulas();
    } else {
      this.recalculateStageFormulas();
    }
  }

  updateDynamicListItemValue(key: string, itemIdx: number, subFieldName: string, newVal: any, valuesContainer: Record<string, any>) {
    const list = this.dynamicListRows[key] || [];
    if (list[itemIdx]) {
      list[itemIdx][subFieldName] = newVal;
      const jsonVal = JSON.stringify(list);
      valuesContainer[key] = jsonVal;
      if (key.includes('_')) {
        this.recalculateParentFormulas();
      } else {
        this.recalculateStageFormulas();
      }
    }
  }

  removeDynamicListItem(key: string, itemIdx: number, valuesContainer: Record<string, any>) {
    const list = this.dynamicListRows[key] || [];
    const removedItem = list[itemIdx];
    list.splice(itemIdx, 1);

    if (removedItem) {
      const name = removedItem.item || removedItem.product;
      this.dynamicListSelected[key] = (this.dynamicListSelected[key] || []).filter(i => i !== name);
    }

    const jsonVal = JSON.stringify(list);
    valuesContainer[key] = jsonVal;
    if (key.includes('_')) {
      this.recalculateParentFormulas();
    } else {
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
    if (!key) return '';
    const lower = key.toLowerCase().trim();
    const dictionary: Record<string, string> = {
      quantity: 'Cantidad',
      cant: 'Cantidad',
      cantidad: 'Cantidad',
      product: 'Producto',
      producto: 'Producto',
      item: 'Ítem',
      items: 'Ítems',
      price: 'Precio',
      cost: 'Costo',
      total: 'Total',
      value: 'Valor',
      valor: 'Valor',
      name: 'Nombre',
      description: 'Descripción',
      observation: 'Observación',
      observations: 'Observaciones',
      comments: 'Comentarios',
      comment: 'Comentario',
      date: 'Fecha',
      status: 'Estado',
      type: 'Tipo',
      unit: 'Unidad',
      format: 'Formato',
      channel: 'Canal',
      platform: 'Plataforma',
      notes: 'Notas',
      file: 'Archivo',
      files: 'Archivos'
    };
    if (dictionary[lower]) {
      return dictionary[lower];
    }
    return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
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

  getStageUploadedFiles(val: any): { name: string; url?: string; isNew?: boolean }[] {
    if (!val) return [];
    try {
      if (typeof val === 'string' && val.startsWith('[')) {
        return JSON.parse(val);
      }
      if (typeof val === 'string') {
        const parts = val.split(',');
        return parts.map(p => ({ name: p.trim() }));
      }
    } catch {
      return [{ name: String(val) }];
    }
    return [];
  }

  downloadStageFormFile(file: any) {
    if (file && file.url) {
      window.open(file.url, '_blank');
    }
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (status) {
      case 'Completed': return 'success';
      case 'In Progress': return 'info';
      case 'Pending': return 'warn';
      case 'Rejected': return 'danger';
      default: return 'secondary';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'Completed': return 'Completado';
      case 'In Progress': return 'En Proceso';
      case 'Pending': return 'Pendiente';
      case 'Rejected': return 'Rechazado';
      case 'Approved': return 'Aprobado';
      case 'Draft': return 'Borrador';
      case 'Cancelled': return 'Cancelado';
      default: return status || 'Pendiente';
    }
  }

  getFormIcon(sub: any): string {
    return 'file-text';
  }

  getFormIconColor(sub: any): string {
    return 'text-primary';
  }

  getDisplayInitialValues(item: any): any[] {
    if (!item) return [];
    if (item.parentValues && item.parentValues.length > 0) {
      return item.parentValues;
    }
    return item.values || [];
  }
}

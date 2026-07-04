import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { ProductionService } from '../../services/production.service';
import { AuthService } from '../../services/auth.service';
import { AzureStorageService } from '../../services/azure-storage.service';

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
    ToastModule,
    TooltipModule,
    TagModule,
    ProgressSpinnerModule,
    PageHeaderComponent
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

  // States
  pendingTasks = signal<any[]>([]);
  loadingTasks = signal<boolean>(false);

  // Action Dialog States
  showActionDialog = signal<boolean>(false);
  loadingAction = signal<boolean>(false);
  selectedTask = signal<any>(null);
  comments = signal<string>('');

  // Additional form to fill at this stage
  stageFormFields = signal<any[]>([]);
  stageFormValues: Record<string, string> = {};
  loadingStageFields = signal<boolean>(false);

  ngOnInit() {
    this.loadPendingTasks();
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
    return task.submissionStatus === 'Rejected' && task.requesterUserId === this.authService.currentUser()?.id;
  }

  openActionDialog(task: any) {
    this.selectedTask.set(task);
    this.comments.set('');
    this.stageFormFields.set([]);
    this.stageFormValues = {};
    this.showActionDialog.set(true);

    const isCorr = this.isCorrection(task);

    if (isCorr) {
      this.loadingStageFields.set(true);
      this.productionService.getDynamicFormFields(task.formId).subscribe({
        next: (fields) => {
          const initialValues: Record<string, string> = {};
          fields.forEach(f => {
            if (f.metadata && typeof f.metadata === 'string') {
              try { f.metadata = JSON.parse(f.metadata); } catch(e){}
            }
            initialValues[f.name] = task.submittedValuesRaw[f.name] || '';
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
    } else if (task.formIdToFill) {
      this.loadingStageFields.set(true);
      this.productionService.getDynamicFormFields(task.formIdToFill).subscribe({
        next: (fields) => {
          const initialValues: Record<string, string> = {};
          const now = new Date();
          const pad = (n: number) => n.toString().padStart(2, '0');
          const formattedDate = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
          const userName = this.authService.currentUser()?.name || '';

          fields.forEach(f => {
            if (f.metadata && typeof f.metadata === 'string') {
              try { f.metadata = JSON.parse(f.metadata); } catch(e){}
            }
            if (f.isReadOnly && f.defaultValueExpression) {
              if (f.defaultValueExpression === '{{CURRENT_DATE_TIME}}') {
                initialValues[f.name] = formattedDate;
              } else if (f.defaultValueExpression === '{{LOGGED_USER_NAME}}') {
                initialValues[f.name] = userName;
              } else {
                initialValues[f.name] = f.defaultValueExpression;
              }
            } else {
              initialValues[f.name] = '';
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

  processAction(action: 'approve' | 'reject') {
    const task = this.selectedTask();
    const notes = this.comments();
    const isCorr = this.isCorrection(task);

    if (action === 'reject' && (!notes || !notes.trim())) {
      this.messageService.add({ severity: 'error', summary: 'Validación', detail: 'Debe ingresar un comentario para justificar el rechazo.' });
      return;
    }

    // Validate fields if approving
    if (action === 'approve' && (task.formIdToFill || isCorr)) {
      const fields = this.stageFormFields();
      for (const field of fields) {
        if (field.isRequired) {
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
            if (!val || !val.trim()) {
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
    // 1. Upload files
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

    // 2. Process action
    this.productionService.actionApproval(task.stateId, action, notes, action === 'approve' ? this.stageFormValues : undefined).subscribe({
      next: () => {
        this.tempFiles = {};
        this.messageService.add({ 
          severity: 'success', 
          summary: 'Éxito', 
          detail: action === 'approve' ? (this.isCorrection(task) ? 'Corrección enviada con éxito.' : 'Solicitud aprobada con éxito.') : 'Solicitud rechazada/devuelta.' 
        });
        this.showActionDialog.set(false);
        this.loadPendingTasks();
        this.loadingAction.set(false);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Ocurrió un error al procesar la acción.' });
        this.loadingAction.set(false);
      }
    });
  }
}

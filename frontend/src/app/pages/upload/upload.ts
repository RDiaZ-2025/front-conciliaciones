import { Component, inject, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StepperModule } from 'primeng/stepper';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { FileUploadModule } from 'primeng/fileupload';
import { ToastModule } from 'primeng/toast';
import { MessageModule } from 'primeng/message';
import { RadioButtonModule } from 'primeng/radiobutton';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageService } from 'primeng/api';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { SessionInfoComponent } from '../../components/shared/session-info/session-info';
import { UploadService } from './upload.service';
import { AuthService } from '../../services/auth';
import { SafeUrlPipe } from '../../pipes/safe-url.pipe';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StepperModule,
    ButtonModule,
    CardModule,
    FileUploadModule,
    ToastModule,
    MessageModule,
    RadioButtonModule,
    CheckboxModule,
    SafeUrlPipe,
    PageHeaderComponent,
    SessionInfoComponent
  ],
  providers: [MessageService],
  templateUrl: './upload.html',
  styleUrl: './upload.scss'
})
export class UploadComponent {
  private uploadService = inject(UploadService);
  private messageService = inject(MessageService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // State
  tipoUsuario = signal<'cliente' | 'agencia' | null>(null);
  activeStep = signal<number>(0);

  excelFile = signal<File | null>(null);
  excelUploaded = signal<boolean>(false);
  debugExcelValues = signal<string[]>([]);

  pdfFile = signal<File | null>(null);
  pdfUploaded = signal<boolean>(false);
  pdfThumbnail = signal<string | null>(null);
  manualPdfConfirmation = signal<boolean>(false);

  deseaSubirMateriales = signal<boolean>(false);
  materiales = signal<File[]>([]);

  uploading = signal<boolean>(false);
  uploadCompleted = signal<boolean>(false);
  envioExitoso = signal<boolean>(false);

  guid = signal<string | null>(null);

  // Computed
  isExcelStepValid = computed(() => !!this.excelFile() && this.excelUploaded());
  isPdfStepValid = computed(() => !!this.pdfFile() && this.pdfUploaded() && this.manualPdfConfirmation());

  constructor() {
    // Generate GUID when Excel is selected (handled in method)
  }

  setTipoUsuario(type: 'cliente' | 'agencia') {
    this.tipoUsuario.set(type);
    this.activeStep.set(1); // Move to next step
  }

  onActiveStepChange(step: number | undefined) {
    if (step !== undefined) {
      this.activeStep.set(step);
    }
  }

  async onExcelSelect(event: any) {
    const file = event.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Solo se permiten archivos Excel (.xlsx)' });
      return;
    }

    // Generate GUID
    this.guid.set(crypto.randomUUID());
    this.excelFile.set(file);

    // Validate
    const validation = await this.uploadService.validateExcel(file);
    if (!validation.isValid) {
      this.messageService.add({ severity: 'error', summary: 'Error de Validación', detail: validation.message });
      this.debugExcelValues.set(validation.debugValues || []);
      this.excelFile.set(null);
      return;
    }

    this.debugExcelValues.set(validation.debugValues || []);

    // Upload
    this.uploading.set(true);
    const uploaded = await this.uploadService.uploadToAzure(file, `validationsOC/${this.guid()}`);
    this.uploading.set(false);

    if (uploaded) {
      this.excelUploaded.set(true);
      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Excel validado y subido correctamente' });
    } else {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al subir el Excel a Azure' });
      this.excelUploaded.set(false);
    }
  }

  async onPdfSelect(event: any) {
    const file = event.files[0];
    if (!file) return;

    if (!this.guid()) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Debe subir el Excel primero' });
      return;
    }

    this.pdfFile.set(file);

    // Validate
    const validation = await this.uploadService.validatePdf(file);
    if (!validation.isValid) {
      this.messageService.add({ severity: 'error', summary: 'Error de Validación', detail: validation.message });
      this.pdfFile.set(null);
      return;
    }

    // Generate Thumbnail (just URL for iframe)
    this.pdfThumbnail.set(URL.createObjectURL(file));

    // Upload
    this.uploading.set(true);
    const uploaded = await this.uploadService.uploadToAzure(file, `validationsOC/${this.guid()}`);
    this.uploading.set(false);

    if (uploaded) {
      this.pdfUploaded.set(true);
      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'PDF validado y subido correctamente' });
    } else {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al subir el PDF a Azure' });
      this.pdfUploaded.set(false);
    }
  }

  onMaterialesSelect(event: any) {
    const files = event.currentFiles;
    const maxSizeInBytes = 1024 * 1024 * 1024; // 1GB
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    for (const file of files) {
      if (file.size > maxSizeInBytes) {
        invalidFiles.push(file.name);
      } else {
        validFiles.push(file);
      }
    }

    if (invalidFiles.length > 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: `Archivos exceden 1GB: ${invalidFiles.join(', ')}`
      });
    }

    this.materiales.set(validFiles);
  }

  async onSubmit() {
    if (!this.guid()) return;

    this.uploading.set(true);

    try {
      // 1. Upload Materials if needed
      if (this.deseaSubirMateriales() && this.materiales().length > 0) {
        const uploadPromises = this.materiales().map(file =>
          this.uploadService.uploadToAzure(file, `validationsOC/${this.guid()}`)
        );

        const results = await Promise.all(uploadPromises);
        if (!results.every(r => r)) {
          throw new Error('Error al subir algunos materiales');
        }
      }

      // 2. Notify N8N
      const payload = {
        tipoUsuario: this.tipoUsuario(),
        excelFilename: this.excelFile()?.name,
        pdfFilename: this.pdfFile()?.name,
        archivos: [this.excelFile()?.name, this.pdfFile()?.name],
        deseaSubirMateriales: this.deseaSubirMateriales(),
        materiales: this.materiales().map(f => f.name),
        guid: this.guid(),
        id: this.guid(),
        data: this.debugExcelValues().reduce((acc: any, curr) => {
          const [key, ...rest] = curr.split(":");
          acc[key.trim()] = rest.join(":").trim();
          return acc;
        }, {}),
      };

      const n8nOk = await this.uploadService.notifyN8N(payload);
      if (!n8nOk) throw new Error('Error al notificar a N8N');

      // 3. Register in DB
      const dbPayload = {
        iduser: this.authService.currentUser()?.id || 1,
        idfolder: this.guid(),
        fecha: new Date().toISOString(),
        status: "uploaded",
        filename: this.excelFile()?.name || ""
      };

      const dbOk = await this.uploadService.registerInDatabase(dbPayload);
      if (!dbOk) throw new Error('Error al registrar en base de datos');

      this.envioExitoso.set(true);
      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Proceso completado correctamente' });

      setTimeout(() => {
        this.resetForm();
      }, 3000);

    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
    } finally {
      this.uploading.set(false);
    }
  }

  resetForm() {
    this.tipoUsuario.set(null);
    this.activeStep.set(0);
    this.excelFile.set(null);
    this.excelUploaded.set(false);
    this.debugExcelValues.set([]);
    this.pdfFile.set(null);
    this.pdfUploaded.set(false);
    this.pdfThumbnail.set(null);
    this.manualPdfConfirmation.set(false);
    this.deseaSubirMateriales.set(false);
    this.materiales.set([]);
    this.uploading.set(false);
    this.uploadCompleted.set(false);
    this.envioExitoso.set(false);
    this.guid.set(null);
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}

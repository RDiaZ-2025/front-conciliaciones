import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StepperModule } from 'primeng/stepper';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { FileUploadModule } from 'primeng/fileupload';
import { ToastModule } from 'primeng/toast';
import { MessageModule } from 'primeng/message';
import { RadioButtonModule } from 'primeng/radiobutton';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageService, SharedModule } from 'primeng/api';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { UploadService } from '../../upload/upload.service';
import { AuthService } from '../../../services/auth.service';
import { SafeUrlPipe } from '../../../pipes/safe-url.pipe';

@Component({
  selector: 'app-upload-dialog',
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
    SharedModule,
    SafeUrlPipe
  ],
  providers: [MessageService],
  templateUrl: './upload-dialog.component.html',
  styleUrl: './upload-dialog.component.scss'
})
export class UploadDialogComponent implements OnInit {
  private uploadService = inject(UploadService);
  private messageService = inject(MessageService);
  private authService = inject(AuthService);
  private ref = inject(DynamicDialogRef);
  private config = inject(DynamicDialogConfig);

  // State
  tipoUsuario = signal<'cliente' | 'agencia' | null>(null);
  activeStep = signal<number>(0);
  requestId = signal<number | null>(null);

  excelFile = signal<File | null>(null);
  excelUploaded = signal<boolean>(false);
  debugExcelValues = signal<string[]>([]);

  pdfFile = signal<File | null>(null);
  pdfUploaded = signal<boolean>(false);
  pdfThumbnail = signal<string | null>(null);
  manualPdfConfirmation = signal<boolean>(false);

  uploading = signal<boolean>(false);
  uploadCompleted = signal<boolean>(false);
  envioExitoso = signal<boolean>(false);

  guid = signal<string | null>(null);

  // Computed
  isExcelStepValid = computed(() => !!this.excelFile() && this.excelUploaded());
  isPdfStepValid = computed(() => !!this.pdfFile() && this.pdfUploaded() && this.manualPdfConfirmation());

  ngOnInit() {
    // Check if we have passed data if needed (e.g. request info)
    if (this.config.data?.request) {
      if (this.config.data.request.id) {
        this.requestId.set(this.config.data.request.id);
      }
      if (this.config.data.request.customerData?.clientAgency) {
        this.tipoUsuario.set(this.config.data.request.customerData.clientAgency);
      }
    }
  }

  cancel() {
    this.ref.close();
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
    const path = this.requestId()
      ? `productionRequest/${this.requestId()}/validationOC`
      : `validationsOC/${this.guid()}`;

    const uploaded = await this.uploadService.uploadToAzure(file, path);
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
    const path = this.requestId()
      ? `productionRequest/${this.requestId()}/validationOC`
      : `validationsOC/${this.guid()}`;

    const uploaded = await this.uploadService.uploadToAzure(file, path);
    this.uploading.set(false);

    if (uploaded) {
      this.pdfUploaded.set(true);
      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'PDF validado y subido correctamente' });
    } else {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al subir el PDF a Azure' });
      this.pdfUploaded.set(false);
    }
  }

  async onSubmit() {
    if (!this.guid()) return;

    this.uploading.set(true);

    try {
      // 1. Notify N8N
      const payload = {
        tipoUsuario: this.tipoUsuario(),
        excelFilename: this.excelFile()?.name,
        pdfFilename: this.pdfFile()?.name,
        archivos: [this.excelFile()?.name, this.pdfFile()?.name],
        guid: this.guid(),
        id: this.guid(),
        data: this.debugExcelValues().reduce((acc: any, curr) => {
          const [key, ...rest] = curr.split(":");
          acc[key.trim()] = rest.join(":").trim();
          return acc;
        }, {}),
      };

      const n8nOk = await this.uploadService.notifyN8N(payload);
      if (!n8nOk) console.warn('Error al notificar a N8N'); // Non-blocking warning

      this.envioExitoso.set(true);
      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Proceso completado correctamente' });

      // Close dialog after success
      setTimeout(() => {
        this.ref.close({ success: true, guid: this.guid() });
      }, 1500);

    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
    } finally {
      this.uploading.set(false);
    }
  }
}

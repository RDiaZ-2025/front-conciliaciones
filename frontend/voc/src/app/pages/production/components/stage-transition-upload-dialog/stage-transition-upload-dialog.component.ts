import { Component, OnInit, inject, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { FileUploadModule, FileUpload } from 'primeng/fileupload';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { AzureStorageService } from '../../../../services/azure-storage.service';
import { ProductionRequest, UploadedFile } from '../../production.models';

@Component({
  selector: 'app-stage-transition-upload-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    FileUploadModule,
    TooltipModule,
    ConfirmDialogModule
  ],
  providers: [ConfirmationService],
  templateUrl: './stage-transition-upload-dialog.component.html'
})
export class StageTransitionUploadDialogComponent implements OnInit {
  @ViewChild('fileUpload') fileUpload!: FileUpload;

  ref = inject(DynamicDialogRef);
  config = inject(DynamicDialogConfig);
  azureService = inject(AzureStorageService);
  messageService = inject(MessageService);
  confirmationService = inject(ConfirmationService);
  cdr = inject(ChangeDetectorRef);

  request!: ProductionRequest;
  existingFiles: UploadedFile[] = [];
  selectedFiles: File[] = [];
  isUploading = false;

  ngOnInit() {
    this.request = this.config.data.request;
    if (this.request) {
      this.loadFiles();
    }
  }

  loadFiles() {
    const folderPath = AzureStorageService.generateProductionRequestFolderPath(this.request.id.toString());
    this.azureService.listFiles(folderPath, 'private').then(blobs => {
      this.existingFiles = blobs.map(blobName => {
        const fileName = blobName.split('/').pop() || blobName;
        return {
          id: blobName,
          name: fileName,
          size: 0,
          type: 'application/octet-stream',
          uploadDate: new Date().toISOString()
        };
      });
      this.cdr.markForCheck(); // Trigger change detection
    }).catch(err => {
      console.error('Error loading files:', err);
    });
  }

  onFileSelect(event: any) {
    if (event.files) {
      this.selectedFiles = [...this.selectedFiles, ...event.files];
    }
  }

  onFileRemove(event: any) {
    const fileToRemove = event.file;
    if (fileToRemove) {
      this.selectedFiles = this.selectedFiles.filter(f => f.name !== fileToRemove.name);
    }
  }

  onFileClear() {
    this.selectedFiles = [];
  }

  async uploadFiles(event: any) {
    const filesToUpload = event.files;

    if (!filesToUpload || filesToUpload.length === 0) {
      return;
    }

    this.isUploading = true;

    try {
      const folderPath = AzureStorageService.generateProductionRequestFolderPath(this.request.id.toString());
      const results = await this.azureService.uploadFiles(filesToUpload, {
        folderPath,
        containerName: 'private'
      });

      const failures = results.filter(r => !r.success);
      if (failures.length > 0) {
        throw new Error(`Failed to upload ${failures.length} files`);
      }

      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Archivos cargados correctamente.' });

      // Clear upload component and reload files
      this.fileUpload.clear();
      this.selectedFiles = [];
      this.loadFiles();

    } catch (error) {
      console.error('Upload error:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al cargar archivos.' });
    } finally {
      this.isUploading = false;
    }
  }

  advance() {
    if (this.existingFiles.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'Debe cargar al menos un (1) documento antes de avanzar.' });
      return;
    }

    this.confirmationService.confirm({
      message: '¿Seguro que todos los documentos están cargados?',
      header: 'Confirmación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      accept: () => {
        this.ref.close({ success: true });
      }
    });
  }

  cancel() {
    this.ref.close();
  }

  downloadFile(file: UploadedFile) {
    this.azureService.downloadSingleFile(file.id, file.name).then(() => {
      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Archivo descargado' });
    }).catch(() => {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al descargar archivo' });
    });
  }
}

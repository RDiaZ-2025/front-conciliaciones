import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { FileUploadModule } from 'primeng/fileupload';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ProductionRequest, UploadedFile } from '../../production.models';
import { AzureStorageService } from '../../../../services/azure-storage';

@Component({
  selector: 'app-production-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    FloatLabelModule,
    TextareaModule,
    DatePickerModule,
    FileUploadModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './production-dialog.html',
  styleUrl: './production-dialog.scss'
})
export class ProductionDialogComponent implements OnInit {
  fb = inject(FormBuilder);
  ref = inject(DynamicDialogRef);
  config = inject(DynamicDialogConfig);
  azureService = inject(AzureStorageService);
  messageService = inject(MessageService);

  form!: FormGroup;
  isEditMode = false;
  uploadedFiles: any[] = [];
  existingFiles: UploadedFile[] = [];
  isUploading = false;

  ngOnInit() {
    this.isEditMode = !!this.config.data?.id;
    const data = this.config.data || {};

    this.form = this.fb.group({
      name: [data.name || '', Validators.required],
      department: [data.department || '', Validators.required],
      contactPerson: [data.contactPerson || '', Validators.required],
      assignedTeam: [data.assignedTeam || '', Validators.required],
      deliveryDate: [data.deliveryDate ? new Date(data.deliveryDate) : null, Validators.required],
      observations: [data.observations || '']
    });

    if (this.isEditMode && data.files) {
      this.existingFiles = data.files;
    }
  }

  async onUpload(event: any) {
    this.isUploading = true;
    const files = event.files;
    const requestId = this.config.data?.id || Date.now().toString(); // Use temp ID if new

    try {
      const folderPath = AzureStorageService.generateProductionFolderPath(requestId);
      const results = await this.azureService.uploadFiles(files, {
        folderPath,
        metadata: {
          requestId,
          uploadType: 'production'
        }
      });

      const newFiles: UploadedFile[] = results.map((result, index) => ({
        id: `${folderPath}/${result.fileName}`,
        name: result.fileName,
        size: files[index].size,
        type: files[index].type,
        url: result.url,
        uploadDate: new Date().toISOString()
      }));

      this.uploadedFiles = [...this.uploadedFiles, ...newFiles];
      this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Files uploaded successfully' });
    } catch (error) {
      console.error('Upload error', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'File upload failed' });
    } finally {
      this.isUploading = false;
    }
  }

  save() {
    if (this.form.valid) {
      const formValue = this.form.value;
      const result: Partial<ProductionRequest> = {
        ...this.config.data,
        ...formValue,
        deliveryDate: formValue.deliveryDate ? formValue.deliveryDate.toISOString().split('T')[0] : undefined,
        files: [...this.existingFiles, ...this.uploadedFiles]
      };
      this.ref.close(result);
    } else {
      Object.keys(this.form.controls).forEach(key => {
        const control = this.form.get(key);
        if (control?.invalid) {
          control.markAsDirty();
        }
      });
    }
  }

  cancel() {
    this.ref.close();
  }

  removeFile(file: UploadedFile) {
    // Logic to remove file (visual only for now, or actual delete if needed)
    this.existingFiles = this.existingFiles.filter(f => f.id !== file.id);
    this.uploadedFiles = this.uploadedFiles.filter(f => f.id !== file.id);
  }
}

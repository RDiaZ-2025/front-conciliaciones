import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FileUploadModule } from 'primeng/fileupload';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-data-rewards-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    FileUploadModule
  ],
  templateUrl: './data-rewards-dialog.component.html'
})
export class DataRewardsDialogComponent {
  ref = inject(DynamicDialogRef);
  config = inject(DynamicDialogConfig);
  fb = inject(FormBuilder);
  messageService = inject(MessageService);

  form: FormGroup;
  uploadedFiles: any[] = [];
  uploadStatus = signal<{[key: string]: boolean}>({});

  constructor() {
    this.form = this.fb.group({
      data_rewards_campaignName: ['', Validators.required],
      data_rewards_video: [null, Validators.required]
    });
  }

  onUpload(event: any, fieldName: string) {
    for (let file of event.files) {
      file.category = fieldName;
      this.uploadedFiles.push(file);
    }
    this.form.patchValue({ [fieldName]: event.files[0] });
    this.uploadStatus.update(s => ({...s, [fieldName]: true}));
    this.messageService.add({ severity: 'info', summary: 'Éxito', detail: 'Archivo cargado correctamente' });
  }

  async submit() {
    if (this.form.valid) {
      const formValue = {
        ...this.form.value,
        files: this.uploadedFiles,
        status: 'COMPLETED'
      };
      this.ref.close(formValue);
    } else {
      this.form.markAllAsTouched();
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Por favor complete todos los campos requeridos.' });
    }
  }

  close() {
    this.ref.close();
  }
}

import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FileUploadModule } from 'primeng/fileupload';
import { TooltipModule } from 'primeng/tooltip';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';
import { TextareaModule } from 'primeng/textarea';

@Component({
  selector: 'app-whatsapp-business-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    FileUploadModule,
    TooltipModule,
    TextareaModule
  ],
  templateUrl: './whatsapp-business-dialog.component.html'
})
export class WhatsappBusinessDialogComponent {
  ref = inject(DynamicDialogRef);
  config = inject(DynamicDialogConfig);
  fb = inject(FormBuilder);
  messageService = inject(MessageService);

  form: FormGroup;
  uploadedFiles: any[] = [];
  uploadStatus = signal<{[key: string]: boolean}>({});

  constructor() {
    this.form = this.fb.group({
      wsp_business_campaignName: ['', Validators.required],
      wsp_business_message: ['', Validators.required],
      wsp_business_images: [null],
      wsp_business_video: [null],
      wsp_business_csv: [null, Validators.required]
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

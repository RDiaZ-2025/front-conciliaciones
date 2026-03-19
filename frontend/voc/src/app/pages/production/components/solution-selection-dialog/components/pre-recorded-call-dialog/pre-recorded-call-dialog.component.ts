import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { FileUploadModule } from 'primeng/fileupload';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-pre-recorded-call-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    CheckboxModule,
    FileUploadModule
  ],
  templateUrl: './pre-recorded-call-dialog.component.html',
  styleUrls: ['./pre-recorded-call-dialog.component.scss']
})
export class PreRecordedCallDialogComponent {
  private fb = inject(FormBuilder);
  public ref = inject(DynamicDialogRef);
  public config = inject(DynamicDialogConfig);
  private messageService = inject(MessageService);

  form: FormGroup;
  uploadedFiles: any[] = [];
  isUploading = signal<boolean>(false);

  constructor() {
    this.form = this.fb.group({
      solutionCategory: ['MOBILE'],
      solutionType: ['PRE_RECORDED_CALL'],
      prc_clientName: ['', Validators.required],
      prc_hasDtmf: [false],
      prc_dtmfOptions: [''],
      prc_hasSms: [false],
      prc_smsText: ['']
    });

    this.form.get('prc_hasDtmf')?.valueChanges.subscribe(val => {
      const dtmfControl = this.form.get('prc_dtmfOptions');
      if (val) {
        dtmfControl?.setValidators([Validators.required]);
      } else {
        dtmfControl?.clearValidators();
      }
      dtmfControl?.updateValueAndValidity();
    });

    this.form.get('prc_hasSms')?.valueChanges.subscribe(val => {
      const smsControl = this.form.get('prc_smsText');
      if (val) {
        smsControl?.setValidators([Validators.required, Validators.maxLength(200)]);
      } else {
        smsControl?.clearValidators();
      }
      smsControl?.updateValueAndValidity();
    });
  }

  getUploadedFile(category: string) {
    return this.uploadedFiles.find(f => f.category === category);
  }

  removeFile(category: string, uploader: any) {
    this.uploadedFiles = this.uploadedFiles.filter(f => f.category !== category);
    if (uploader && typeof uploader.clear === 'function') {
      uploader.clear();
    }
  }

  onUpload(event: any, category: string, uploader: any) {
    for (const file of event.files) {
      this.uploadedFiles = this.uploadedFiles.filter(f => f.category !== category);
      this.uploadedFiles.push({ ...file, category });
    }
    this.messageService.add({ severity: 'info', summary: 'Success', detail: 'File uploaded' });
    if (uploader && typeof uploader.clear === 'function') {
      uploader.clear();
    }
  }

  async submit() {
    if (this.form.valid) {
      const audio = this.uploadedFiles.find(f => f.category === 'audio');
      if (!audio) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Falta el archivo de audio (.wav).' });
        return;
      }

      const formValue = {
        ...this.form.value,
        files: this.uploadedFiles,
        status: 'COMPLETED'
      };
      this.ref.close(formValue);
    } else {
      this.form.markAllAsTouched();
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Por favor corrija los errores.' });
    }
  }

  cancel() {
    this.ref.close();
  }
}

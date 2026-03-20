import { Component, inject, signal, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FileUploadModule } from 'primeng/fileupload';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';
import { DomSanitizer } from '@angular/platform-browser';

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
export class DataRewardsDialogComponent implements OnDestroy {
  ref = inject(DynamicDialogRef);
  config = inject(DynamicDialogConfig);
  fb = inject(FormBuilder);
  messageService = inject(MessageService);
  sanitizer = inject(DomSanitizer);
  cd = inject(ChangeDetectorRef);

  form: FormGroup;
  uploadedFiles: any[] = [];
  uploadStatus = signal<{[key: string]: boolean}>({});
  private objectUrls: string[] = [];

  constructor() {
    this.form = this.fb.group({
      data_rewards_campaignName: ['', Validators.required],
      data_rewards_video: [null, Validators.required]
    });
  }

  ngOnDestroy() {
    this.objectUrls.forEach(url => URL.revokeObjectURL(url));
  }

  getUploadedFile(category: string) {
    return this.uploadedFiles.find(f => f.category === category);
  }

  removeFile(category: string, uploader: any) {
    this.uploadedFiles = this.uploadedFiles.filter(f => f.category !== category);
    this.form.patchValue({ [category]: null });
    this.uploadStatus.update(s => ({...s, [category]: false}));
    if (uploader && typeof uploader.clear === 'function') {
      uploader.clear();
    }
  }

  onUpload(event: any, fieldName: string, uploader: any) {
    for (let file of event.files) {
      this.uploadedFiles = this.uploadedFiles.filter(f => f.category !== fieldName);
      
      let safeUrl = null;
      if (file.type.startsWith('video/')) {
        const objectURL = URL.createObjectURL(file);
        this.objectUrls.push(objectURL);
        safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(objectURL);
      }
      
      file.category = fieldName;
      file.safeUrl = safeUrl;
      this.uploadedFiles.push(file);
    }
    this.form.patchValue({ [fieldName]: event.files[0] });
    this.uploadStatus.update(s => ({...s, [fieldName]: true}));
    this.messageService.add({ severity: 'info', summary: 'Éxito', detail: 'Archivo cargado correctamente' });
    if (uploader && typeof uploader.clear === 'function') {
      uploader.clear();
    }
    this.cd.detectChanges();
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

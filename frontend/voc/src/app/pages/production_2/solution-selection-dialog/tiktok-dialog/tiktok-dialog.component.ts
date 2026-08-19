import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FileUploadModule } from 'primeng/fileupload';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-tiktok-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    FileUploadModule
  ],
  templateUrl: './tiktok-dialog.component.html',
  styleUrls: ['./tiktok-dialog.component.scss']
})
export class TiktokDialogComponent {
  private fb = inject(FormBuilder);
  public ref = inject(DynamicDialogRef);
  public config = inject(DynamicDialogConfig);
  private messageService = inject(MessageService);

  form: FormGroup;
  uploadedFiles: any[] = [];
  isUploading = signal<boolean>(false);

  constructor() {
    this.form = this.fb.group({
      solutionCategory: ['SOCIAL'],
      solutionType: ['TIKTOK'],
      tiktok_brandName: ['', Validators.required],
      tiktok_adDesc: ['', [Validators.required, Validators.maxLength(100)]]
    });
  }

  onUpload(event: any, category: string) {
    for (const file of event.files) {
      this.uploadedFiles = this.uploadedFiles.filter(f => f.category !== category || category === 'tiktok_videos');
      file.category = category;
      this.uploadedFiles.push(file);
    }
    this.messageService.add({ severity: 'info', summary: 'Success', detail: 'File uploaded' });
  }

  async submit() {
    if (this.form.valid) {
      const videos = this.uploadedFiles.filter(f => f.category === 'tiktok_videos');
      const logo = this.uploadedFiles.find(f => f.category === 'tiktok_logo');

      if (videos.length === 0) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'TikTok requiere al menos un video.' });
        return;
      }
      if (videos.length > 5) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'TikTok permite máximo 5 videos.' });
        return;
      }
      if (!logo) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'TikTok requiere un Logo.' });
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

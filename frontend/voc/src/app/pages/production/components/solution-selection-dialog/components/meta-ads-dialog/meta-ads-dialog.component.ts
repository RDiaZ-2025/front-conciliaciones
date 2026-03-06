import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { FileUploadModule } from 'primeng/fileupload';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-meta-ads-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    FileUploadModule
  ],
  templateUrl: './meta-ads-dialog.component.html',
  styleUrls: ['./meta-ads-dialog.component.scss']
})
export class MetaAdsDialogComponent {
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
      solutionType: ['FACEBOOK_INSTAGRAM'],
      fb_primaryText: ['', [Validators.required, Validators.maxLength(125)]],
      fb_title: ['', [Validators.required, Validators.maxLength(27)]],
      fb_description: ['', [Validators.required, Validators.maxLength(27)]]
    });
  }

  onUpload(event: any, category: string) {
    for (const file of event.files) {
      this.uploadedFiles.push({ ...file, category });
    }
    this.messageService.add({ severity: 'info', summary: 'Success', detail: 'File uploaded' });
  }

  async submit() {
    if (this.form.valid) {
      const media = this.uploadedFiles.filter(f => f.category === 'fb_media');
      if (media.length === 0) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Facebook/Instagram requiere al menos un archivo multimedia (Imagen o Video).' });
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

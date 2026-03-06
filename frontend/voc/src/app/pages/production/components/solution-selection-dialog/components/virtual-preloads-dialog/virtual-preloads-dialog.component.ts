import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FileUploadModule } from 'primeng/fileupload';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-virtual-preloads-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    FileUploadModule
  ],
  templateUrl: './virtual-preloads-dialog.component.html',
  styleUrls: ['./virtual-preloads-dialog.component.scss']
})
export class VirtualPreloadsDialogComponent {
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
      solutionType: ['VIRTUAL_PRELOADS'],
      vp_appName: ['', Validators.required],
      vp_clientName: ['', Validators.required],
      vp_playStoreUrl: ['', Validators.pattern(/https?:\/\/.+/)],
      vp_notificationText: ['', Validators.maxLength(50)]
    });
  }

  onUpload(event: any, category: string) {
    for (const file of event.files) {
      this.uploadedFiles = this.uploadedFiles.filter(f => f.category !== category);
      this.uploadedFiles.push({ ...file, category });
    }
    this.messageService.add({ severity: 'info', summary: 'Success', detail: 'File uploaded' });
  }

  async submit() {
    if (this.form.valid) {
      const icon = this.uploadedFiles.find(f => f.category === 'icon');
      const image = this.uploadedFiles.find(f => f.category === 'image');
      const apk = this.uploadedFiles.find(f => f.category === 'apk');

      if (!icon) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Falta el Icono (256x256 px).' });
        return;
      }
      if (!image) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Falta la Imagen (Aspecto 2:1).' });
        return;
      }

      const playUrl = this.form.get('vp_playStoreUrl')?.value;
      if (!playUrl && !apk) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Debe proporcionar una URL de Play Store O subir un archivo APK.' });
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

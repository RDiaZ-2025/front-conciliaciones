import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { FileUploadModule } from 'primeng/fileupload';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-generic-upload-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    FileUploadModule
  ],
  templateUrl: './generic-upload-dialog.component.html',
  styleUrls: ['./generic-upload-dialog.component.scss']
})
export class GenericUploadDialogComponent {
  private fb = inject(FormBuilder);
  public ref = inject(DynamicDialogRef);
  public config = inject(DynamicDialogConfig);
  private messageService = inject(MessageService);

  form: FormGroup;
  uploadedFiles: any[] = [];
  isUploading = signal<boolean>(false);
  solutionType = signal<string>('');
  
  instructions = computed(() => {
    const type = this.solutionType();
    // Copy instructions from solutionRules in material-preparation-dialog
    const rules: {[key: string]: string} = {
        'MOBILE_DISPLAY': 'Tamaños de los banners: 300x200, 300x50, 300x110, 300x250, 200x200',
        'DESKTOP_DISPLAY': 'Tamaños de los banners: 160x600, 200x200, 250x250, 486x60, 728x90, 970x90, 300x600, 300x250, 300x280',
        'ADINTERACTIVE': 'Tamaño: 720x720px, Peso máximo de 4MB, Archivo tipo: Mp4, mov',
        'FULL_REMINDER': 'Tamaño: 720x720px - 300x250px, Duración de 20 segundos, 30 segundos máximo, Archivo tipo: Mp4, mov',
        'SUN_INSTANT': 'Tamaño: 720x720px, Peso máximo de 4MB, Archivo tipo: mp4 - mov',
        'SKIN': 'Editables Layered PSD, Max 250Mb. Incluir fuentes.',
        'CTV_VIDEO': 'Duración Max: 120 seg. Max 1920x1080. MP4. Max 50MBs',
        'DATA_REWARDS': 'Video MP4, Max 27MB.'
    };
    return rules[type] || 'Suba los archivos requeridos para esta solución.';
  });

  constructor() {
    const selection = this.config.data?.selection;
    this.solutionType.set(selection?.solution || 'GENERIC');

    this.form = this.fb.group({
      solutionCategory: [selection?.category],
      solutionType: [selection?.solution],
      solutionSubcategory: [selection?.type]
    });
  }

  onUpload(event: any) {
    for (const file of event.files) {
      file.category = 'general';
      this.uploadedFiles.push(file);
    }
    this.messageService.add({ severity: 'info', summary: 'Success', detail: 'File uploaded' });
  }

  async submit() {
    if (this.uploadedFiles.length === 0) {
       this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Se requiere al menos un archivo.' });
       return;
    }

    const formValue = {
      ...this.form.value,
      files: this.uploadedFiles,
      status: 'COMPLETED'
    };
    this.ref.close(formValue);
  }

  cancel() {
    this.ref.close();
  }
}

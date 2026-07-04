import { LucideIconComponent } from '../../../../components/shared/lucide-icon/lucide-icon.component';
import { CachedImagePipe } from '../../../../pipes/cached-image.pipe';
import { Component, inject, signal, computed, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { FileUploadModule } from 'primeng/fileupload';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-generic-upload-dialog',
  standalone: true,
  imports: [
    LucideIconComponent,
    CachedImagePipe,
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    FileUploadModule
  ],
  templateUrl: './generic-upload-dialog.component.html',
  styleUrls: ['./generic-upload-dialog.component.scss']
})
export class GenericUploadDialogComponent implements OnDestroy {
  private fb = inject(FormBuilder);
  public ref = inject(DynamicDialogRef);
  public config = inject(DynamicDialogConfig);
  private messageService = inject(MessageService);
  private sanitizer = inject(DomSanitizer);
  private cd = inject(ChangeDetectorRef);

  form: FormGroup;
  uploadedFiles: any[] = [];
  isUploading = signal<boolean>(false);
  solutionType = signal<string>('');
  private objectUrls: string[] = [];
  
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

  ngOnDestroy() {
    this.objectUrls.forEach(url => URL.revokeObjectURL(url));
  }

  async onUpload(event: any, uploader: any) {
    const validFiles = [];
    
    for (const file of event.files) {
      if (this.solutionType() === 'MOBILE_DISPLAY' && file.type.startsWith('image/')) {
         const isValid = await this.validateImageDimensions(file, [
             { w: 300, h: 200 },
             { w: 300, h: 50 },
             { w: 300, h: 110 },
             { w: 300, h: 250 },
             { w: 200, h: 200 }
         ]);
         
         if (!isValid) {
             this.messageService.add({ 
                 severity: 'error', 
                 summary: 'Dimensión incorrecta', 
                 detail: `El archivo ${file.name} no cumple con los tamaños permitidos (300x200, 300x50, 300x110, 300x250, 200x200).` 
             });
             continue; // Skip invalid file
         }
      }

      let safeUrl = null;
      if (file.type.startsWith('image/')) {
        const objectURL = URL.createObjectURL(file);
        this.objectUrls.push(objectURL);
        safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(objectURL);
      }
      
      validFiles.push({ ...file, category: 'general', safeUrl, name: file.name });
    }
    
    if (validFiles.length > 0) {
      this.uploadedFiles.push(...validFiles);
      this.messageService.add({ severity: 'info', summary: 'Éxito', detail: 'Archivo(s) cargado(s) correctamente' });
    }

    if (uploader && typeof uploader.clear === 'function') {
      uploader.clear();
    }
    this.cd.detectChanges();
  }

  validateImageDimensions(file: File, allowedDimensions: {w: number, h: number}[]): Promise<boolean> {
      return new Promise((resolve) => {
          const img = new Image();
          const objectUrl = URL.createObjectURL(file);
          
          img.onload = () => {
              const match = allowedDimensions.some(d => d.w === img.width && d.h === img.height);
              URL.revokeObjectURL(objectUrl);
              resolve(match);
          };
          
          img.onerror = () => {
              URL.revokeObjectURL(objectUrl);
              resolve(false); // If it can't be loaded as an image, we reject it
          };
          
          img.src = objectUrl;
      });
  }

  removeFile(index: number) {
    this.uploadedFiles.splice(index, 1);
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

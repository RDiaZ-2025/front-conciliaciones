import { LucideIconComponent } from '../../../../../components/shared/lucide-icon/lucide-icon.component';
import { CachedImagePipe } from '../../../../../pipes/cached-image.pipe';
import { Component, inject, signal, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FileUploadModule } from 'primeng/fileupload';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';
import { DomSanitizer } from '@angular/platform-browser';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-virtual-preloads-dialog',
  standalone: true,
  imports: [
    LucideIconComponent,
    CachedImagePipe,
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    FileUploadModule,
    TooltipModule
  ],
  templateUrl: './virtual-preloads-dialog.component.html',
  styleUrls: ['./virtual-preloads-dialog.component.scss']
})
export class VirtualPreloadsDialogComponent implements OnDestroy {
  private fb = inject(FormBuilder);
  public ref = inject(DynamicDialogRef);
  public config = inject(DynamicDialogConfig);
  private messageService = inject(MessageService);
  private cd = inject(ChangeDetectorRef);
  private sanitizer = inject(DomSanitizer);

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

  ngOnDestroy() {
    this.uploadedFiles.forEach(f => {
      if (f.objectURL) {
        URL.revokeObjectURL(f.objectURL);
      }
    });
  }

  getUploadedFile(category: string) {
    return this.uploadedFiles.find(f => f.category === category);
  }

  removeFile(category: string, uploader: any) {
    const file = this.uploadedFiles.find(f => f.category === category);
    if (file && file.objectURL) {
      URL.revokeObjectURL(file.objectURL);
    }
    this.uploadedFiles = this.uploadedFiles.filter(f => f.category !== category);
    if (uploader && typeof uploader.clear === 'function') {
      uploader.clear();
    }
  }

  onUpload(event: any, category: string, uploader: any) {
    if (!event.files || event.files.length === 0) return;
    const file = event.files[0];

    // For non-image files (like APK), just add them directly
    if (category === 'apk') {
      this.processValidFile(file, category, uploader);
      return;
    }

    // For images (icon, image), validate dimensions
    const img = new Image();
    const objectURL = URL.createObjectURL(file);
    img.src = objectURL;

    img.onload = () => {
      const width = img.width;
      const height = img.height;
      let isValid = true;
      let errorMsg = '';

      if (category === 'icon') {
        if (width !== 256 || height !== 256) {
          isValid = false;
          errorMsg = `El icono debe ser exactamente de 256x256 píxeles. La imagen actual es de ${width}x${height}.`;
        }
      } 
      // Optional: Add validation for 'image' category if needed in future
      // else if (category === 'image') { ... }

      if (!isValid) {
        this.messageService.add({ severity: 'error', summary: 'Dimensiones Inválidas', detail: errorMsg });
        URL.revokeObjectURL(objectURL);
        if (uploader && typeof uploader.clear === 'function') {
          uploader.clear();
        }
      } else {
        this.processValidFile(file, category, uploader, objectURL);
      }
      this.cd.detectChanges();
    };
  }

  private processValidFile(file: any, category: string, uploader: any, objectURL: string | null = null) {
    // Remove existing file of same category if any
    this.removeFile(category, null);
    
    let safeUrl = null;
    if (objectURL) {
      safeUrl = this.sanitizer.bypassSecurityTrustUrl(objectURL);
    }

    const fileWithCategory = Object.assign(file, { category, objectURL, safeUrl });
    this.uploadedFiles.push(fileWithCategory);
    this.messageService.add({ severity: 'info', summary: 'Éxito', detail: 'Archivo subido correctamente' });
    
    if (uploader && typeof uploader.clear === 'function') {
      uploader.clear();
    }
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

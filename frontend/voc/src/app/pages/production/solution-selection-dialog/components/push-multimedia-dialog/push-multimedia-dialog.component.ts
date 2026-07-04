import { CachedImagePipe } from '../../../../../pipes/cached-image.pipe';
import { Component, inject, signal, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FileUploadModule } from 'primeng/fileupload';
import { TooltipModule } from 'primeng/tooltip';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-push-multimedia-dialog',
  standalone: true,
  imports: [
    CachedImagePipe,
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    FileUploadModule,
    TooltipModule
  ],
  templateUrl: './push-multimedia-dialog.component.html',
  styleUrls: ['./push-multimedia-dialog.component.scss']
})
export class PushMultimediaDialogComponent implements OnDestroy {
  private fb = inject(FormBuilder);
  public ref = inject(DynamicDialogRef);
  public config = inject(DynamicDialogConfig);
  private messageService = inject(MessageService);
  private cd = inject(ChangeDetectorRef);
  private sanitizer = inject(DomSanitizer);

  form: FormGroup;
  uploadedFiles: any[] = [];
  isUploading = signal<boolean>(false);

  pushTextLine1Validator = (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null;
    const errors: ValidationErrors = {};
    if (!value.startsWith("Publicidad De:")) {
      errors['invalidPrefix'] = true;
      errors['expectedPrefix'] = "Publicidad De:";
    }
    return Object.keys(errors).length > 0 ? errors : null;
  }

  constructor() {
    this.form = this.fb.group({
      solutionCategory: ['MOBILE'],
      solutionType: ['PUSH_MULTIMEDIA'],
      push_textLine1: ['', [Validators.required, Validators.maxLength(25), this.pushTextLine1Validator]],
      push_textLine2: ['', [Validators.maxLength(35)]],
      push_url: ['', [Validators.required, Validators.pattern(/https?:\/\/.+/)]],
      push_utm: ['']
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

    const img = new Image();
    const objectURL = URL.createObjectURL(file);
    img.src = objectURL;
    
    img.onload = () => {
      const width = img.width;
      const height = img.height;
      let isValid = true;
      let errorMsg = '';

      if (category === 'banner') {
        if (width !== 700 || height !== 300) {
          isValid = false;
          errorMsg = `El banner debe ser exactamente de 700x300 píxeles. La imagen actual es de ${width}x${height}.`;
        }
      } else if (category === 'logo') {
        if (width !== 96 || height !== 96) {
          isValid = false;
          errorMsg = `El logo debe ser exactamente de 96x96 píxeles. La imagen actual es de ${width}x${height}.`;
        }
      }

      if (!isValid) {
        this.messageService.add({ severity: 'error', summary: 'Dimensiones Inválidas', detail: errorMsg });
        URL.revokeObjectURL(objectURL);
        if (uploader && typeof uploader.clear === 'function') {
          uploader.clear();
        }
      } else {
        // Remove existing file of same category if any
        this.removeFile(category, null);
        
        const safeUrl = this.sanitizer.bypassSecurityTrustUrl(objectURL);
        const fileWithCategory = Object.assign(file, { category, objectURL, safeUrl });
        this.uploadedFiles.push(fileWithCategory);
        this.messageService.add({ severity: 'info', summary: 'Éxito', detail: 'Archivo subido correctamente' });
        if (uploader && typeof uploader.clear === 'function') {
          uploader.clear();
        }
      }
      this.cd.detectChanges();
    };
  }

  async submit() {
    if (this.form.valid) {
      const banner = this.uploadedFiles.find(f => f.category === 'banner');
      const logo = this.uploadedFiles.find(f => f.category === 'logo');

      if (!banner) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Falta la imagen Banner (700x300 JPG).' });
        return;
      }
      if (!logo) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Falta la imagen Logo (96x96 JPG).' });
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

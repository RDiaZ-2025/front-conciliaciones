import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FileUploadModule } from 'primeng/fileupload';
import { TooltipModule } from 'primeng/tooltip';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-push-multimedia-dialog',
  standalone: true,
  imports: [
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
export class PushMultimediaDialogComponent {
  private fb = inject(FormBuilder);
  public ref = inject(DynamicDialogRef);
  public config = inject(DynamicDialogConfig);
  private messageService = inject(MessageService);

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

  onUpload(event: any, category: string) {
    for (const file of event.files) {
      this.uploadedFiles = this.uploadedFiles.filter(f => f.category !== category);
      this.uploadedFiles.push({ ...file, category });
    }
    this.messageService.add({ severity: 'info', summary: 'Success', detail: 'File uploaded' });
  }

  async submit() {
    if (this.form.valid) {
      const banner = this.uploadedFiles.find(f => f.category === 'banner');
      const logo = this.uploadedFiles.find(f => f.category === 'logo');

      if (!banner) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Falta la imagen Banner (700x330 JPG).' });
        return;
      }
      if (!logo) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Falta la imagen Logo (96x96 JPG).' });
        return;
      }

      // Note: Real implementation would validate dimensions here
      // Assuming Azure upload happens in parent or we simulate here
      
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

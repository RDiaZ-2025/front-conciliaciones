import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';
import { FileUploadModule } from 'primeng/fileupload';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-content-redplus-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    TextareaModule,
    CheckboxModule,
    FileUploadModule
  ],
  templateUrl: './content-redplus-dialog.component.html',
  styleUrls: ['./content-redplus-dialog.component.scss']
})
export class ContentRedplusDialogComponent {
  private fb = inject(FormBuilder);
  public ref = inject(DynamicDialogRef);
  public config = inject(DynamicDialogConfig);
  private messageService = inject(MessageService);

  form: FormGroup;
  uploadedFiles: any[] = [];
  isUploading = signal<boolean>(false);

  wordCountValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;
    const wordCount = value.trim().split(/\s+/).length;
    if (wordCount < 450 || wordCount > 700) {
      return { wordCount: { min: 450, max: 700, actual: wordCount } };
    }
    return null;
  }

  constructor() {
    this.form = this.fb.group({
      solutionCategory: ['CONTENT_RED_PLUS'],
      solutionSubcategory: ['CONTENIDO_RED_PLUS'],
      solutionType: ['CONTENT_PUBLIRREPORTAJE'],
      article_content: ['', [Validators.required, this.wordCountValidator]],
      redplus_legal_check: [false, Validators.requiredTrue]
    });
  }

  onUpload(event: any, category: string) {
    for (const file of event.files) {
      file.category = category;
      this.uploadedFiles.push(file);
    }
    this.messageService.add({ severity: 'info', summary: 'Success', detail: 'File uploaded' });
  }

  async submit() {
    if (this.form.valid) {
      const images = this.uploadedFiles.filter(f => f.category === 'redplus_images' && (f.name.toLowerCase().endsWith('.jpg') || f.name.toLowerCase().endsWith('.jpeg')));
      
      if (images.length === 0) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Debe incluir al menos una imagen (JPG).' });
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

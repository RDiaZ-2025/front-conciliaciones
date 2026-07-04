import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FileUploadModule } from 'primeng/fileupload';
import { AccordionModule } from 'primeng/accordion';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-pmax-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    FileUploadModule,
    AccordionModule
  ],
  templateUrl: './pmax-dialog.component.html',
  styleUrls: ['./pmax-dialog.component.scss']
})
export class PmaxDialogComponent {
  private fb = inject(FormBuilder);
  public ref = inject(DynamicDialogRef);
  public config = inject(DynamicDialogConfig);
  private messageService = inject(MessageService);

  form: FormGroup;
  uploadedFiles: any[] = [];
  isUploading = signal<boolean>(false);

  constructor() {
    this.form = this.fb.group({
      solutionCategory: ['PROGRAMMATIC'],
      solutionType: ['PMAX_AD'],
      pmax_youtubeUrl: ['', [Validators.required, Validators.pattern(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.*$/)]],
      pmax_title90: ['', [Validators.required, Validators.maxLength(90)]],
      pmax_titles30: this.fb.array([]),
      pmax_descriptions90: this.fb.array([]),
      pmax_descriptions60: this.fb.array([])
    });

    // Initialize arrays
    this.initArrays();
  }

  get pmaxTitles30() { return this.form.get('pmax_titles30') as FormArray; }
  get pmaxDescriptions90() { return this.form.get('pmax_descriptions90') as FormArray; }
  get pmaxDescriptions60() { return this.form.get('pmax_descriptions60') as FormArray; }

  initArrays() {
    for (let i = 0; i < 5; i++) {
      this.pmaxTitles30.push(this.fb.control('', [Validators.required, Validators.maxLength(30)]));
      this.pmaxDescriptions90.push(this.fb.control('', [Validators.required, Validators.maxLength(90)]));
      this.pmaxDescriptions60.push(this.fb.control('', [Validators.required, Validators.maxLength(60)]));
    }
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
      const images = this.uploadedFiles.filter(f => f.category === 'pmax_images');
      if (images.length === 0) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'PMAX requiere al menos una imagen Display.' });
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

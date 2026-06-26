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
  selector: 'app-native-ads-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    FileUploadModule
  ],
  templateUrl: './native-ads-dialog.component.html',
  styleUrls: ['./native-ads-dialog.component.scss']
})
export class NativeAdsDialogComponent {
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
      solutionType: ['NATIVE_ADS'],
      native_shortTitle: ['', [Validators.required, Validators.maxLength(25)]],
      native_longTitle: ['', [Validators.required, Validators.maxLength(50)]],
      native_shortDesc: ['', [Validators.required, Validators.maxLength(90)]],
      native_longDesc: ['', [Validators.required, Validators.maxLength(150)]]
    });
  }

  onUpload(event: any, category: string) {
    for (const file of event.files) {
      this.uploadedFiles = this.uploadedFiles.filter(f => f.category !== category);
      file.category = category;
      this.uploadedFiles.push(file);
    }
    this.messageService.add({ severity: 'info', summary: 'Success', detail: 'File uploaded' });
  }

  async submit() {
    if (this.form.valid) {
      const banner = this.uploadedFiles.find(f => f.category === 'native_banner');
      const logo = this.uploadedFiles.find(f => f.category === 'native_logo');

      if (!banner) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Native Ads requiere un Banner.' });
        return;
      }
      if (!logo) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Native Ads requiere un Logo.' });
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

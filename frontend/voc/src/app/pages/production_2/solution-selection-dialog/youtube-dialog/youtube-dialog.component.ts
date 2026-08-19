import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';

@Component({
  selector: 'app-youtube-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule
  ],
  templateUrl: './youtube-dialog.component.html',
  styleUrls: ['./youtube-dialog.component.scss']
})
export class YoutubeDialogComponent {
  private fb = inject(FormBuilder);
  public ref = inject(DynamicDialogRef);
  public config = inject(DynamicDialogConfig);

  form: FormGroup;
  solutionType: string = 'YOUTUBE';

  constructor() {
    this.solutionType = this.config.data?.selection?.solution || 'YOUTUBE';
    
    this.form = this.fb.group({
      solutionCategory: ['VIDEO'],
      solutionType: [this.solutionType],
      youtube_url: ['', [Validators.required, Validators.pattern(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.*$/)]]
    });
  }

  submit() {
    if (this.form.valid) {
      const formValue = {
        ...this.form.value,
        status: 'COMPLETED'
      };
      this.ref.close(formValue);
    } else {
      this.form.markAllAsTouched();
    }
  }

  cancel() {
    this.ref.close();
  }
}

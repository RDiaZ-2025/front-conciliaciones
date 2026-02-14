import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { FloatLabelModule } from 'primeng/floatlabel';
import { Permission, PermissionFormData } from '../permissions.models';

@Component({
  selector: 'app-permission-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    FloatLabelModule
  ],
  templateUrl: './permission-dialog.component.html',
  styleUrl: './permission-dialog.component.scss'
})
export class PermissionDialogComponent implements OnChanges {
  private fb = inject(FormBuilder);

  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  @Input() item: Permission | null = null;
  @Input() saving = false;

  @Output() save = new EventEmitter<PermissionFormData>();

  form: FormGroup;

  constructor() {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: ['']
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible'] && this.visible) {
      this.resetForm();
    }
  }

  resetForm() {
    if (this.item) {
      this.form.patchValue({
        name: this.item.name,
        description: this.item.description || ''
      });
    } else {
      this.form.reset({
        name: '',
        description: ''
      });
    }
  }

  onSubmit() {
    if (this.form.valid) {
      this.save.emit(this.form.value);
    } else {
      Object.keys(this.form.controls).forEach(key => {
        const control = this.form.get(key);
        control?.markAsDirty();
        control?.markAsTouched();
      });
    }
  }
}

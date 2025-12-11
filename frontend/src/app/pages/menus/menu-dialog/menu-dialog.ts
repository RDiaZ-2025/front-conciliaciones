import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { FloatLabelModule } from 'primeng/floatlabel';
import { MenuItem, MenuFormData } from '../menus.models';

@Component({
  selector: 'app-menu-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    CheckboxModule,
    SelectModule,
    FloatLabelModule
  ],
  templateUrl: './menu-dialog.html',
  styleUrl: './menu-dialog.scss'
})
export class MenuDialogComponent implements OnChanges {
  private fb = inject(FormBuilder);

  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  @Input() item: MenuItem | null = null;
  @Input() parentOptions: { label: string, value: number | null }[] = [];
  @Input() permissionOptions: { label: string, value: number }[] = [];
  @Input() saving = false;

  @Output() save = new EventEmitter<MenuFormData>();

  form: FormGroup;

  constructor() {
    this.form = this.fb.group({
      label: ['', Validators.required],
      icon: [''],
      route: [''],
      parentId: [null],
      displayOrder: [0, Validators.required],
      isActive: [true],
      permissionId: [null]
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
        label: this.item.label,
        icon: this.item.icon || '',
        route: this.item.route || '',
        parentId: this.item.parentId || null,
        displayOrder: this.item.displayOrder,
        isActive: this.item.isActive,
        permissionId: this.item.permissionId || null
      });
    } else {
      this.form.reset({
        label: '',
        icon: '',
        route: '',
        parentId: null,
        displayOrder: 0,
        isActive: true,
        permissionId: null
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

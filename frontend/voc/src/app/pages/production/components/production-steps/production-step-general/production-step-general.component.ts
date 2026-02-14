import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { FileUploadModule } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { Team, UploadedFile } from '../../../production.models';
import { User } from '../../../../../services/user.service';

@Component({
  selector: 'app-production-step-general',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    FloatLabelModule,
    SelectModule,
    TextareaModule,
    DatePickerModule,
    FileUploadModule,
    ButtonModule,
    TooltipModule
  ],
  templateUrl: './production-step-general.component.html'
})
export class ProductionStepGeneralComponent {
  @Input() form!: FormGroup;
  @Input() teams: Team[] = [];
  @Input() statuses: { id: string | number, label: string }[] = [];
  @Input() minDate: Date = new Date();
  @Input() existingFiles: UploadedFile[] = [];
  @Input() disabledFileUpload = false;
  @Input() canRemoveFiles = false;

  @Output() fileSelect = new EventEmitter<any>();
  @Output() fileRemove = new EventEmitter<any>();
  @Output() fileClear = new EventEmitter<void>();
  @Output() fileDownload = new EventEmitter<UploadedFile>();
  @Output() fileDelete = new EventEmitter<UploadedFile>();

  onFileSelect(event: any) {
    this.fileSelect.emit(event);
  }

  onFileRemove(event: any) {
    this.fileRemove.emit(event);
  }

  onFileClear() {
    this.fileClear.emit();
  }

  downloadFile(file: UploadedFile) {
    this.fileDownload.emit(file);
  }

  removeFile(file: UploadedFile) {
    this.fileDelete.emit(file);
  }
}
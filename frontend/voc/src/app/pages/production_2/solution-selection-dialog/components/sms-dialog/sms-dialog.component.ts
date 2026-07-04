import { LucideIconComponent } from '../../../../../components/shared/lucide-icon/lucide-icon.component';
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { FileUploadModule } from 'primeng/fileupload';
import { TooltipModule } from 'primeng/tooltip';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';

@Component({
    selector: 'app-sms-dialog',
    standalone: true,
    imports: [
    LucideIconComponent,
        CommonModule,
        ReactiveFormsModule,
        ButtonModule,
        InputTextModule,
        TextareaModule,
        FileUploadModule,
        TooltipModule
    ],
    templateUrl: './sms-dialog.component.html',
    styles: [`
        :host {
            display: block;
        }
    `]
})
export class SmsDialogComponent {
    private fb = inject(FormBuilder);
    public ref = inject(DynamicDialogRef);
    public config = inject(DynamicDialogConfig);
    private messageService = inject(MessageService);

    form: FormGroup;
    uploadedFiles: any[] = [];
    isUploading = signal<boolean>(false);

    // SMS Constraints
    maxFileSize = 1000000; // 1MB
    fileAccept = 'image/*,video/*';

    smsContentValidator = (control: AbstractControl): ValidationErrors | null => {
        const value = control.value;
        if (!value) return null;

        const errors: ValidationErrors = {};

        // 1. Forbidden characters: Accented (á, é, í, ó, ú), Opening punctuation (¿, ¡), ñ, Ñ
        if (/[áéíóúÁÉÍÓÚñÑ¡¿]/.test(value)) {
            errors['forbiddenChars'] = true;
        }

        return Object.keys(errors).length > 0 ? errors : null;
    }

    constructor() {
        this.form = this.fb.group({
            solutionCategory: ['MOBILE'],
            solutionType: ['SMS'],
            sms_clientName: ['', [Validators.required, Validators.pattern(/^[A-Z0-9\s]+$/)]],
            sms_messageText: ['', [Validators.required, Validators.maxLength(170), this.smsContentValidator]],
            sms_destinationUrl: ['', [Validators.required]]
        });

        // Pre-fill if editing? The requirement is for new flow, but maybe editing too.
        if (this.config.data?.request?.materialData) {
            this.form.patchValue(this.config.data.request.materialData);
            if (this.config.data.request.materialData.files) {
                this.uploadedFiles = this.config.data.request.materialData.files;
            }
        }
    }

    onUpload(event: any) {
        for (let file of event.files) {
            this.uploadedFiles.push(file);
        }
        this.messageService.add({ severity: 'info', summary: 'File Uploaded', detail: '' });
    }

    submit() {
        if (this.form.valid) {
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

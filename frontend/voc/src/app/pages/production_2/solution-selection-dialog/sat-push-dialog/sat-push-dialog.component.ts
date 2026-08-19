import { LucideIconComponent } from '../../../../components/lucide-icon/lucide-icon.component';
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';

@Component({
    selector: 'app-sat-push-dialog',
    standalone: true,
    imports: [
    LucideIconComponent,
        CommonModule,
        ReactiveFormsModule,
        ButtonModule,
        InputTextModule,
        TextareaModule,
        CheckboxModule,
        TooltipModule
    ],
    templateUrl: './sat-push-dialog.component.html',
    styles: [`
        :host {
            display: block;
        }
    `]
})
export class SatPushDialogComponent {
    private fb = inject(FormBuilder);
    public ref = inject(DynamicDialogRef);
    public config = inject(DynamicDialogConfig);
    private messageService = inject(MessageService);

    form: FormGroup;
    
    satMessageValidator = (control: AbstractControl): ValidationErrors | null => {
        const value = control.value;
        if (!value) return null;
        const errors: ValidationErrors = {};

        // Check accents/Ñ
        if (/[áéíóúÁÉÍÓÚñÑ]/.test(value)) {
            errors['forbiddenChars'] = true;
        }

        // Check prefix
        const formGroup = control.parent;
        if (formGroup) {
            const clientName = formGroup.get('sat_clientName')?.value;
            if (clientName) {
                const prefix = `PUBLICIDAD DE ${clientName.toUpperCase()}`;
                // Allow case-insensitive prefix check and allow optional colon
                const cleanValue = value.toUpperCase().replace(/^PUBLICIDAD DE:\s*/, 'PUBLICIDAD DE ');
                if (!cleanValue.startsWith(prefix)) {
                    errors['invalidPrefix'] = true;
                    errors['expectedPrefix'] = prefix;
                }
            } else {
                if (!value.toUpperCase().startsWith("PUBLICIDAD DE ")) {
                    errors['invalidPrefix'] = true;
                    errors['expectedPrefix'] = "PUBLICIDAD DE (NOMBRE CLIENTE)";
                }
            }
        }

        return Object.keys(errors).length > 0 ? errors : null;
    }

    constructor() {
        this.form = this.fb.group({
            solutionCategory: ['MOBILE'],
            solutionType: ['SAT_PUSH'],
            sat_clientName: ['', [Validators.required, Validators.pattern(/^[a-zA-Z\s]+$/)]],
            sat_messageText: ['', [Validators.required, Validators.maxLength(160), this.satMessageValidator]],
            sat_url: ['', [Validators.required, Validators.pattern(/https?:\/\/.+/)]],
            sat_isClickToCall: [false],
            sat_phoneNumber: ['']
        });

        // Pre-fill
        if (this.config.data?.request?.materialData) {
            this.form.patchValue(this.config.data.request.materialData);
        }

        // Handle Client Name Changes
        this.form.get('sat_clientName')?.valueChanges.subscribe(() => {
            this.form.get('sat_messageText')?.updateValueAndValidity();
        });

        // Handle Click-to-Call Toggle
        this.form.get('sat_isClickToCall')?.valueChanges.subscribe(isClickToCall => {
            this.updateSatValidators(isClickToCall);
        });
    }

    updateSatValidators(isClickToCall: boolean) {
        const phoneControl = this.form.get('sat_phoneNumber');
        if (isClickToCall) {
            phoneControl?.setValidators([Validators.required, Validators.pattern(/^\d{10}$/)]);
        } else {
            phoneControl?.setValidators([Validators.pattern(/^\d{10}$/)]); // Optional
            if (!phoneControl?.value) {
                phoneControl?.setErrors(null);
            }
        }
        phoneControl?.updateValueAndValidity();
    }

    submit() {
        if (this.form.valid) {
            const formValue = {
                ...this.form.value,
                sat_clientName: this.form.value.sat_clientName?.toUpperCase(),
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

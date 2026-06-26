import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray, AbstractControl } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { FileUploadModule } from 'primeng/fileupload';
import { TooltipModule } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';

@Component({
    selector: 'app-email-marketing-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        ButtonModule,
        InputTextModule,
        TextareaModule,
        FileUploadModule,
        TooltipModule,
        SelectModule
    ],
    templateUrl: './email-marketing-dialog.component.html',
    styles: [`
        :host {
            display: block;
        }
    `]
})
export class EmailMarketingDialogComponent {
    private fb = inject(FormBuilder);
    public ref = inject(DynamicDialogRef);
    public config = inject(DynamicDialogConfig);
    private messageService = inject(MessageService);

    form: FormGroup;
    uploadedFiles: any[] = [];
    isUploading = signal<boolean>(false);

    emailTemplates = [
        { label: 'Plantilla Básica', value: 'BASIC' },
        { label: 'Promocional', value: 'PROMO' },
        { label: 'Newsletter', value: 'NEWSLETTER' },
        { label: 'Transaccional', value: 'TRANSACTIONAL' }
    ];

    socialNetworks = [
        { label: 'Facebook', value: 'FACEBOOK' },
        { label: 'Instagram', value: 'INSTAGRAM' },
        { label: 'Twitter / X', value: 'TWITTER' },
        { label: 'LinkedIn', value: 'LINKEDIN' },
        { label: 'YouTube', value: 'YOUTUBE' },
        { label: 'TikTok', value: 'TIKTOK' },
        { label: 'Otro', value: 'OTHER' }
    ];

    constructor() {
        this.form = this.fb.group({
            solutionCategory: ['MOBILE'], // Or generic category
            solutionType: ['EMAIL_MARKETING'],
            email_template: ['', Validators.required],
            email_trackingUrls: ['', [Validators.pattern(/https?:\/\/.+/)]],
            email_colors: ['', [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}(,\s*#[0-9A-Fa-f]{6})*$/)]],
            email_fonts: ['', Validators.required],
            email_footer_info: ['', Validators.required],
            email_contact_emails: ['', [Validators.required, Validators.email]],
            email_support_links: ['', [Validators.pattern(/https?:\/\/.+/)]],
            email_legal_text: ['', Validators.required],
            email_dnsConfig: ['', Validators.required],
            
            email_ctas_list: this.fb.array([]),
            email_social_list: this.fb.array([])
        });

        if (this.config.data?.request?.materialData) {
            this.form.patchValue(this.config.data.request.materialData);
            if (this.config.data.request.materialData.files) {
                this.uploadedFiles = this.config.data.request.materialData.files;
            }
        }
    }

    get emailCtasList() {
        return this.form.get('email_ctas_list') as FormArray;
    }

    get emailSocialList() {
        return this.form.get('email_social_list') as FormArray;
    }

    addEmailCta() {
        const ctaGroup = this.fb.group({
            text: ['', Validators.required],
            url: ['', [Validators.required, Validators.pattern(/^(https?:\/\/.+|[\d\+]+)$/)]]
        });
        this.emailCtasList.push(ctaGroup);
    }

    removeEmailCta(index: number) {
        this.emailCtasList.removeAt(index);
    }

    addEmailSocial() {
        const socialGroup = this.fb.group({
            network: ['', Validators.required],
            url: ['', [Validators.required, Validators.pattern(/^(https?:\/\/.+|[\d\+]+)$/)]]
        });
        this.emailSocialList.push(socialGroup);
    }

    removeEmailSocial(index: number) {
        this.emailSocialList.removeAt(index);
    }

    onUpload(event: any, category: string = 'email_logo') {
        for (let file of event.files) {
            file.category = category; // Tag file
            this.uploadedFiles.push(file);
        }
        this.messageService.add({ severity: 'info', summary: 'File Uploaded', detail: '' });
    }

    validateImageDimensions(file: File, category: string): Promise<boolean> {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(img.src);
                // Basic check, max width 600px for email logo
                if (category === 'email_logo' && img.width > 600) {
                     this.messageService.add({ severity: 'error', summary: 'Error', detail: `El logo excede el ancho máximo de 600px. (${img.width}px)` });
                     resolve(false);
                } else {
                    resolve(true);
                }
            };
            img.onerror = () => {
                URL.revokeObjectURL(img.src);
                resolve(false);
            };
            img.src = URL.createObjectURL(file);
        });
    }

    async submit() {
        if (this.form.valid) {
            // Check required file
            const logo = this.uploadedFiles.find(f => f.category === 'email_logo');
            if (!logo) {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Falta el Logo (PNG/JPG, Máx 600px).' });
                return;
            }

            // Validate dimensions
            this.isUploading.set(true);
            const isValid = await this.validateImageDimensions(logo, 'email_logo');
            this.isUploading.set(false);

            if (!isValid) return;

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

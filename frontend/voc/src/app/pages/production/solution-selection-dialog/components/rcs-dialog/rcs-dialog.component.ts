import { LucideIconComponent } from '../../../../../components/shared/lucide-icon/lucide-icon.component';
import { Component, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray, AbstractControl } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { FileUploadModule } from 'primeng/fileupload';
import { TooltipModule } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';
import { RadioButtonModule } from 'primeng/radiobutton';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';

@Component({
    selector: 'app-rcs-dialog',
    standalone: true,
    imports: [
    LucideIconComponent,
        CommonModule,
        ReactiveFormsModule,
        ButtonModule,
        InputTextModule,
        TextareaModule,
        FileUploadModule,
        TooltipModule,
        SelectModule,
        RadioButtonModule
    ],
    templateUrl: './rcs-dialog.component.html',
    styles: [`
        :host {
            display: block;
        }
    `]
})
export class RcsDialogComponent {
    private fb = inject(FormBuilder);
    public ref = inject(DynamicDialogRef);
    public config = inject(DynamicDialogConfig);
    private messageService = inject(MessageService);
    private cd = inject(ChangeDetectorRef);

    form: FormGroup;
    uploadedFiles: any[] = [];
    isUploading = signal<boolean>(false);

    // RCS Constraints
    maxFileSize = 5000000; // 5MB
    fileAccept = 'image/*,video/*';

    mediaTypes = [
        { label: 'Imagen', value: 'IMAGE' },
        { label: 'Carrusel', value: 'CAROUSEL' },
        { label: 'Video', value: 'VIDEO' }
    ];

    constructor() {
        this.form = this.fb.group({
            solutionCategory: ['MOBILE'],
            solutionType: ['RCS'],
            rcs_agentData: [null, Validators.required],
            rcs_messageText: ['', [Validators.maxLength(100)]],
            rcs_redirectUrl: ['', [Validators.pattern(/https?:\/\/.+/)]],
            rcs_mediaType: [''], // IMAGE, CAROUSEL, VIDEO
            
            // RCS Media specific
            rcs_image_caption: [''],
            rcs_image_button_label: [''],
            rcs_image_button_url: [''],
            
            rcs_buttons: this.fb.array([])
        });

        // Pre-fill if editing
        if (this.config.data?.request?.materialData) {
            this.form.patchValue(this.config.data.request.materialData);
            if (this.config.data.request.materialData.files) {
                this.uploadedFiles = this.config.data.request.materialData.files;
            }
            // Handle FormArray population if needed (complex for deep structures, might need manual push)
        }

        // Handle RCS Media Type Changes
        this.form.get('rcs_mediaType')?.valueChanges.subscribe(type => {
            this.updateRCSValidators(type);
        });
    }

    get rcsButtons() {
        return this.form.get('rcs_buttons') as FormArray;
    }

    addRcsButton() {
        if (this.rcsButtons.length < 4) {
            const buttonGroup = this.fb.group({
                label: ['', [Validators.required, Validators.maxLength(25)]],
                type: ['URL', Validators.required], // URL or PHONE
                value: ['', [Validators.required, Validators.pattern(/^(https?:\/\/.+|[\d\+]+)$/)]]
            });
            this.rcsButtons.push(buttonGroup);
        }
    }

    removeRcsButton(index: number) {
        this.rcsButtons.removeAt(index);
    }

    updateRCSValidators(mediaType: string) {
        // Limpiar archivos multimedia al cambiar de tipo para evitar inconsistencias
        this.uploadedFiles = [];

        if (mediaType === 'IMAGE') {
            this.setValidators('rcs_image_caption', [Validators.maxLength(25)]);
            this.setValidators('rcs_image_button_label', [Validators.maxLength(25)]);
            this.setValidators('rcs_image_button_url', [Validators.pattern(/https?:\/\/.+/)]);
        } else {
            // Clear validators if not image
            this.setValidators('rcs_image_caption', []);
            this.setValidators('rcs_image_button_label', []);
            this.setValidators('rcs_image_button_url', []);
        }
        this.form.updateValueAndValidity();
    }

    setValidators(controlName: string, validators: any[]) {
        const control = this.form.get(controlName);
        if (control) {
            control.setValidators(validators);
            control.updateValueAndValidity({ emitEvent: false });
        }
    }

    onUpload(event: any, uploader: any) {
        for (let file of event.files) {
            if (file.type.startsWith('image/')) {
                const img = new Image();
                img.src = URL.createObjectURL(file);
                img.onload = () => {
                    if (img.width !== 480 || img.height !== 220) {
                        this.messageService.add({ 
                            severity: 'error', 
                            summary: 'Dimensión Inválida', 
                            detail: `La imagen ${file.name} debe ser exactamente de 480x220 píxeles. (Actual: ${img.width}x${img.height})` 
                        });
                        
                        // Limpiar el uploader para que no muestre ni retenga el archivo inválido
                        if (uploader && typeof uploader.clear === 'function') {
                            uploader.clear();
                        }
                    } else {
                        // Evitar duplicados
                        if (!this.uploadedFiles.some(f => f.name === file.name && f.size === file.size)) {
                            this.uploadedFiles.push(file);
                            this.messageService.add({ severity: 'info', summary: 'Archivo Subido', detail: file.name });
                        }
                        if (uploader && typeof uploader.clear === 'function') {
                            uploader.clear();
                        }
                    }
                    this.cd.detectChanges();
                    URL.revokeObjectURL(img.src);
                };
            } else {
                if (!this.uploadedFiles.some(f => f.name === file.name && f.size === file.size)) {
                    this.uploadedFiles.push(file);
                    this.messageService.add({ severity: 'info', summary: 'Archivo Subido', detail: file.name });
                }
                if (uploader && typeof uploader.clear === 'function') {
                    uploader.clear();
                }
            }
        }
    }

    removeUploadedFile(index: number, uploader: any) {
        const file = this.uploadedFiles[index];
        this.uploadedFiles.splice(index, 1);
        
        if (uploader && uploader.files) {
            const uploaderIndex = uploader.files.findIndex((f: any) => f.name === file.name && f.size === file.size);
            if (uploaderIndex !== -1) {
                uploader.files.splice(uploaderIndex, 1);
            }
        }
    }

    onAgentDataUpload(event: any) {
        if (event.files && event.files.length > 0) {
            const file = event.files[0];
            this.form.patchValue({ rcs_agentData: file });
            this.form.get('rcs_agentData')?.markAsTouched();
            this.form.get('rcs_agentData')?.updateValueAndValidity();
            this.messageService.add({ severity: 'info', summary: 'Archivo Excel Subido', detail: file.name });
        }
    }

    submit() {
        if (this.form.valid) {
            // RCS Custom Validations
            if (!this.form.get('rcs_agentData')?.value) {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Datos de Creación de Agente Google requeridos.' });
                return;
            }

            const mediaType = this.form.get('rcs_mediaType')?.value;
            if (mediaType === 'IMAGE') {
                if (this.uploadedFiles.length !== 1) {
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: 'RCS Imagen requiere exactamente 1 archivo.' });
                    return;
                }
            } else if (mediaType === 'CAROUSEL') {
                if (this.uploadedFiles.length < 1 || this.uploadedFiles.length > 4) {
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: 'RCS Carrusel requiere entre 1 y 4 imágenes.' });
                    return;
                }
            } else if (mediaType === 'VIDEO') {
                if (this.uploadedFiles.length !== 2) {
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: 'RCS Video requiere 2 archivos (Thumbnail y Video).' });
                    return;
                }
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

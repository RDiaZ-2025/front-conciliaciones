import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { FileUploadModule } from 'primeng/fileupload';
import { TooltipModule } from 'primeng/tooltip';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';
import { AzureStorageService } from '../../../../services/azure-storage.service';

@Component({
  selector: 'app-material-preparation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    SelectModule,
    InputTextModule,
    TextareaModule,
    FileUploadModule,
    TooltipModule
  ],
  templateUrl: './material-preparation-dialog.component.html',
  styleUrls: ['./material-preparation-dialog.component.scss']
})
export class MaterialPreparationDialogComponent {
  private fb = inject(FormBuilder);
  public ref = inject(DynamicDialogRef);
  public config = inject(DynamicDialogConfig);
  private messageService = inject(MessageService);
  private azureService = inject(AzureStorageService);

  solutions = [
    { label: 'SMS', value: 'SMS' },
    { label: 'RCS', value: 'RCS' },
    { label: 'SAT PUSH', value: 'SAT_PUSH' },
    { label: 'PUSH MULTIMEDIA', value: 'PUSH_MULTIMEDIA' },
    { label: 'PRECARGAS VIRTUALES', value: 'VIRTUAL_PRELOADS' },
    { label: 'LLAMADA PREGRABADA', value: 'PRE_RECORDED_CALL' },
    { label: 'WHATSAPP BUSINESS', value: 'WHATSAPP_BUSINESS' },
    { label: 'MARKETING POR EMAIL', value: 'EMAIL_MARKETING' },
    { label: 'RECOMPENSAS DE DATOS', value: 'DATA_REWARDS' }
  ];

  form: FormGroup;
  selectedSolution = signal<string | null>(null);
  uploadedFiles: any[] = [];
  isUploading = signal<boolean>(false);

  // Computed property for file acceptance based on solution
  fileAccept = computed(() => {
    const solution = this.selectedSolution();
    switch (solution) {
      case 'SMS':
      case 'RCS':
      case 'SAT_PUSH':
      case 'PUSH_MULTIMEDIA':
      case 'VIRTUAL_PRELOADS':
      case 'WHATSAPP_BUSINESS':
        return 'image/*,video/*'; // General media
      case 'PRE_RECORDED_CALL':
        return 'audio/*';
      case 'EMAIL_MARKETING':
        return '.html,.zip,image/*';
      case 'DATA_REWARDS':
        return 'video/*,image/*';
      default:
        return '*/*';
    }
  });

  // Computed property for max file size based on solution (bytes)
  maxFileSize = computed(() => {
    const solution = this.selectedSolution();
    switch (solution) {
      case 'SMS': return 1000000; // 1MB
      case 'RCS': return 5000000; // 5MB
      case 'SAT_PUSH': return 2000000; // 2MB
      case 'PUSH_MULTIMEDIA': return 2000000; // 2MB
      case 'VIRTUAL_PRELOADS': return 2000000; // 2MB
      case 'PRE_RECORDED_CALL': return 5000000; // 5MB
      case 'WHATSAPP_BUSINESS': return 10000000; // 10MB
      case 'EMAIL_MARKETING': return 10000000; // 10MB
      case 'DATA_REWARDS': return 50000000; // 50MB
      default: return 50000000;
    }
  });

  // Computed property for form validity including file requirements
  isFormValid = computed(() => {
    if (this.form.invalid) return false;
    
    // Specific file requirements
    const solution = this.selectedSolution();
    if (solution === 'DATA_REWARDS' && this.uploadedFiles.length === 0) {
        return false;
    }
    if (solution === 'PRE_RECORDED_CALL' && this.uploadedFiles.length === 0) {
        return false;
    }
    if (solution === 'EMAIL_MARKETING' && this.uploadedFiles.length === 0) {
        return false;
    }
    
    return true;
  });

  fileRequirementMessage = computed(() => {
    const solution = this.selectedSolution();
    if ((solution === 'DATA_REWARDS' || solution === 'PRE_RECORDED_CALL' || solution === 'EMAIL_MARKETING') && this.uploadedFiles.length === 0) {
        return 'Se requiere al menos un archivo para esta solución.';
    }
    return '';
  });

  constructor() {
    this.form = this.fb.group({
      solutionType: [null, Validators.required],
      
      // SMS
      sms_clientName: [''],
      sms_messageText: [''],
      sms_destinationUrl: [''],

      // RCS
      rcs_agentData: [''],
      rcs_messageText: [''],
      rcs_redirectUrl: [''],

      // SAT PUSH
      sat_messageText: [''],
      sat_url: [''],
      sat_phoneNumber: [''],

      // PUSH MULTIMEDIA
      push_textLine1: [''],
      push_textLine2: [''],
      push_url: [''],
      push_utm: [''],

      // VIRTUAL PRELOADS
      vp_appName: [''],
      vp_clientName: [''],
      vp_playStoreUrl: [''],
      vp_notificationText: [''],

      // PRE-RECORDED CALL
      call_smsText: [''],
      
      // WHATSAPP
      wa_fbMessengerId: [''],

      // EMAIL MARKETING
      email_colors: [''],
      email_fonts: [''],
      email_ctas: [''],
      email_socialLinks: [''],
      email_footerData: [''],
      email_dnsConfig: [''],
      email_trackingUrls: [''],

      // DATA REWARDS
      // handled by file upload
    });

    this.form.get('solutionType')?.valueChanges.subscribe(value => {
      this.selectedSolution.set(value);
      this.updateValidators(value);
    });
  }

  updateValidators(solution: string) {
    // Clear all validators first
    Object.keys(this.form.controls).forEach(key => {
      if (key !== 'solutionType') {
        this.form.get(key)?.clearValidators();
        this.form.get(key)?.updateValueAndValidity({ emitEvent: false });
      }
    });

    if (solution === 'SMS') {
      this.setValidators('sms_clientName', [Validators.required, Validators.pattern(/^[A-Z\s]+$/)]);
      this.setValidators('sms_messageText', [
        Validators.required, 
        Validators.maxLength(160), // Updated per GSM standard typically 160
        Validators.pattern(/^[^ñÑáéíóúÁÉÍÓÚ]*$/), 
        Validators.pattern(/^[^!¡¿?.,;:]/) 
      ]);
      this.setValidators('sms_destinationUrl', [Validators.required, Validators.pattern(/https?:\/\/.+/)]);
    }
    else if (solution === 'RCS') {
        this.setValidators('rcs_agentData', [Validators.required]);
        this.setValidators('rcs_messageText', [Validators.maxLength(350)]);
        this.setValidators('rcs_redirectUrl', [Validators.required, Validators.pattern(/https?:\/\/.+/)]);
    }
    else if (solution === 'SAT_PUSH') {
        this.setValidators('sat_messageText', [
            Validators.required,
            Validators.maxLength(160),
            Validators.pattern(/^[^ñÑáéíóúÁÉÍÓÚ]*$/),
            Validators.pattern(/^Publicidad de [A-Z\s]+/) 
        ]);
        this.setValidators('sat_url', [Validators.required, Validators.pattern(/https?:\/\/.+/)]);
        this.setValidators('sat_phoneNumber', [Validators.required, Validators.pattern(/^\d{10}$/)]);
    }
    else if (solution === 'PUSH_MULTIMEDIA') {
        this.setValidators('push_textLine1', [
            Validators.required,
            Validators.maxLength(25),
            Validators.pattern(/^Publicidad De:/)
        ]);
        this.setValidators('push_textLine2', [Validators.maxLength(35)]);
        this.setValidators('push_url', [Validators.required, Validators.pattern(/https?:\/\/.+/)]);
    }
    else if (solution === 'VIRTUAL_PRELOADS') {
        this.setValidators('vp_appName', [Validators.required]);
        this.setValidators('vp_clientName', [Validators.required]);
        this.setValidators('vp_playStoreUrl', [Validators.required, Validators.pattern(/https?:\/\/.+/)]);
        this.setValidators('vp_notificationText', [Validators.maxLength(50)]);
    }
    else if (solution === 'PRE_RECORDED_CALL') {
        this.setValidators('call_smsText', [Validators.maxLength(200)]);
    }
    else if (solution === 'WHATSAPP_BUSINESS') {
        this.setValidators('wa_fbMessengerId', [Validators.required]);
    }
    else if (solution === 'EMAIL_MARKETING') {
        this.setValidators('email_colors', [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}(,\s*#[0-9A-Fa-f]{6})*$/)]);
        this.setValidators('email_fonts', [Validators.required]);
        this.setValidators('email_ctas', [Validators.required]);
        this.setValidators('email_socialLinks', [Validators.required]);
        this.setValidators('email_footerData', [Validators.required]);
        this.setValidators('email_dnsConfig', [Validators.required]);
        this.setValidators('email_trackingUrls', [Validators.required]);
    }
    // DATA REWARDS has no form controls to validate, but we check files on submit
    
    this.form.updateValueAndValidity();
  }

  setValidators(controlName: string, validators: any[]) {
      const control = this.form.get(controlName);
      if (control) {
          control.setValidators(validators);
          control.updateValueAndValidity({ emitEvent: false });
      }
  }

  saveDraft() {
    const formValue = {
      ...this.form.value,
      files: this.uploadedFiles,
      status: 'DRAFT'
    };
    this.ref.close(formValue);
  }

  submit() {
    // Custom validation for DATA_REWARDS
    if (this.selectedSolution() === 'DATA_REWARDS' && this.uploadedFiles.length === 0) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Data Rewards requiere al menos una carga de archivo.' });
        return;
    }

    if (this.form.valid) {
      const formValue = {
        ...this.form.value,
        files: this.uploadedFiles,
        status: 'COMPLETED'
      };
      this.ref.close(formValue);
    } else {
      this.form.markAllAsTouched();
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Por favor corrija los errores en el formulario.' });
    }
  }

  cancel() {
    this.ref.close();
  }

  async onUpload(event: any) {
      this.isUploading.set(true);
      const files = event.files;
      const folderPath = `production-requests/${this.config.data?.request?.id || 'temp'}/material-prep`;
      
      try {
          const results = await this.azureService.uploadFiles(files, {
              folderPath: folderPath,
              containerName: 'private' 
          });

          results.forEach(res => {
              if (res.success) {
                  this.uploadedFiles.push({
                      name: res.fileName,
                      url: res.url,
                      type: 'file' // Simplified
                  });
              } else {
                  this.messageService.add({ severity: 'error', summary: 'Error', detail: `Error al subir ${res.fileName}: ${res.error}` });
              }
          });
          
          this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Archivos subidos exitosamente' });
      } catch (error) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al subir archivos' });
      } finally {
          this.isUploading.set(false);
      }
  }
}

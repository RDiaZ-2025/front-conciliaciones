import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, FormArray } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { FileUploadModule } from 'primeng/fileupload';
import { TooltipModule } from 'primeng/tooltip';
import { RadioButtonModule } from 'primeng/radiobutton';
import { CheckboxModule } from 'primeng/checkbox';
import { KeyFilterModule } from 'primeng/keyfilter';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';
import { AzureStorageService } from '../../../../services/azure-storage.service';

import { AccordionModule } from 'primeng/accordion';

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
    TooltipModule,
    RadioButtonModule,
    CheckboxModule,
    KeyFilterModule,
    AccordionModule
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

  categories = [
    { label: 'MOBILE', value: 'MOBILE' },
    { label: 'PROGRAMÁTICA', value: 'PROGRAMMATIC' },
    { label: 'CONTENIDO RED+', value: 'CONTENT_RED_PLUS' }
  ];

  solutionsMap: { [key: string]: any[] } = {
    'MOBILE': [
      { label: 'SMS', value: 'SMS' },
      { label: 'RCS', value: 'RCS' },
      { label: 'SAT PUSH', value: 'SAT_PUSH' },
      { label: 'PUSH MULTIMEDIA', value: 'PUSH_MULTIMEDIA' },
      { label: 'PRECARGAS VIRTUALES', value: 'VIRTUAL_PRELOADS' },
      { label: 'LLAMADA PREGRABADA', value: 'PRE_RECORDED_CALL' },
      { label: 'WHATSAPP BUSINESS', value: 'WHATSAPP_BUSINESS' },
      { label: 'MARKETING POR EMAIL', value: 'EMAIL_MARKETING' },
      { label: 'DATA REWARDS', value: 'DATA_REWARDS' }
    ],
    'PROGRAMMATIC': [],
    'CONTENT_RED_PLUS': []
  };

  filteredSolutions: any[] = [];

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
        return 'image/png,image/jpeg';
      case 'DATA_REWARDS':
        return 'video/mp4';
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
      case 'DATA_REWARDS': return 27000000; // 27MB
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
    if (solution === 'PRE_RECORDED_CALL') {
        const audio = this.uploadedFiles.find(f => f.category === 'audio');
        if (!audio) {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Falta el archivo de audio (.wav).' });
            return false;
        }
        
        const hasDtmf = this.form.get('prc_hasDtmf')?.value;
        if (hasDtmf && !this.form.get('prc_dtmfOptions')?.value) {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Debe configurar las opciones DTMF.' });
            return false;
        }

        const hasSms = this.form.get('prc_hasSms')?.value;
        if (hasSms && !this.form.get('prc_smsText')?.value) {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Debe ingresar el texto del SMS de seguimiento.' });
            return false;
        }
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
      solutionCategory: [null, Validators.required],
      solutionType: [null, Validators.required],
      
      // SMS
      sms_clientName: [''],
      sms_messageText: [''],
      sms_destinationUrl: [''],

      // RCS
      rcs_agentData: [''],
      rcs_messageText: [''],
      rcs_redirectUrl: [''],
      rcs_buttons: this.fb.array([]),
      rcs_mediaType: [''], // IMAGE, CAROUSEL, VIDEO
      
      // RCS Media specific
      rcs_image_caption: [''],
      rcs_image_button_label: [''],
      rcs_image_button_url: [''],

      // SAT PUSH
      sat_clientName: [''],
      sat_messageText: [''],
      sat_url: [''],
      sat_isClickToCall: [false],
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
      prc_clientName: [''],
      prc_hasDtmf: [false],
      prc_dtmfOptions: [''],
      prc_hasSms: [false],
      prc_smsText: [''],
      
      // WHATSAPP
      wa_fbMessengerId: [''],

      // EMAIL MARKETING
      email_template: [''],
      email_trackingUrls: [''],
      email_colors: [''],
      email_fonts: [''],
      email_ctas_list: this.fb.array([]),
      email_social_list: this.fb.array([]),
      email_footer_info: [''],
      email_contact_emails: [''],
      email_support_links: [''],
      email_legal_text: [''],
      email_dnsConfig: [''],

      // DATA REWARDS
      // handled by file upload
    });

    this.form.get('solutionType')?.valueChanges.subscribe(value => {
      this.selectedSolution.set(value);
      this.updateValidators(value);
    });

    // Handle Category Changes
    this.form.get('solutionCategory')?.valueChanges.subscribe(category => {
      this.filteredSolutions = this.solutionsMap[category] || [];
      this.form.get('solutionType')?.setValue(null);
      // If empty, we can optionaly disable the control or show a message, 
      // but the template will handle the empty list.
    });

    // Re-validate SMS message text when Client Name changes
    this.form.get('sms_clientName')?.valueChanges.subscribe(() => {
        if (this.selectedSolution() === 'SMS') {
            this.form.get('sms_messageText')?.updateValueAndValidity();
        }
    });

    // Handle RCS Media Type Changes
    this.form.get('rcs_mediaType')?.valueChanges.subscribe(type => {
        if (this.selectedSolution() === 'RCS') {
            this.updateRCSValidators(type);
        }
    });

    // Handle SAT PUSH Client Name Changes
    this.form.get('sat_clientName')?.valueChanges.subscribe(() => {
        if (this.selectedSolution() === 'SAT_PUSH') {
            this.form.get('sat_messageText')?.updateValueAndValidity();
        }
    });

    // Handle SAT PUSH Click-to-Call Toggle
    this.form.get('sat_isClickToCall')?.valueChanges.subscribe(isClickToCall => {
        if (this.selectedSolution() === 'SAT_PUSH') {
            this.updateSatValidators(isClickToCall);
        }
    });

    // Handle PRE-RECORDED CALL Toggle
    this.form.get('prc_hasDtmf')?.valueChanges.subscribe(() => {
        if (this.selectedSolution() === 'PRE_RECORDED_CALL') {
             this.updatePrcValidators();
        }
    });
    this.form.get('prc_hasSms')?.valueChanges.subscribe(() => {
        if (this.selectedSolution() === 'PRE_RECORDED_CALL') {
             this.updatePrcValidators();
        }
    });
  }

  get rcsButtons() {
      return this.form.get('rcs_buttons') as FormArray;
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

  updateValidators(solution: string) {
    // Clear all validators first
    Object.keys(this.form.controls).forEach(key => {
      if (key !== 'solutionType') {
        this.form.get(key)?.clearValidators();
        this.form.get(key)?.updateValueAndValidity({ emitEvent: false });
      }
    });

    // Apply specific validators based on solution
    // PRE-RECORDED CALL: Clear validators
    this.form.get('prc_clientName')?.clearValidators();
    this.form.get('prc_dtmfOptions')?.clearValidators();
    this.form.get('prc_smsText')?.clearValidators();

    // WHATSAPP: Clear validators
    this.form.get('wa_fbMessengerId')?.clearValidators();

    // VIRTUAL PRELOADS: Clear validators
    this.form.get('vp_appName')?.clearValidators();
    this.form.get('vp_clientName')?.clearValidators();
    this.form.get('vp_playStoreUrl')?.clearValidators();
    this.form.get('vp_notificationText')?.clearValidators();
    
    if (solution === 'SMS') {
      this.setValidators('sms_clientName', [Validators.required, Validators.pattern(/^[A-Z\s]+$/)]);
      this.setValidators('sms_messageText', [
        Validators.required, 
        Validators.maxLength(200),
        this.smsContentValidator
      ]);
      this.setValidators('sms_destinationUrl', [Validators.required, Validators.pattern(/https?:\/\/.+/)]);
    }
    else if (solution === 'RCS') {
        this.setValidators('rcs_agentData', [Validators.required]);
        this.setValidators('rcs_messageText', [Validators.maxLength(350)]);
        this.setValidators('rcs_redirectUrl', []); // Not mandatory if buttons used? Prompt says "Message may include... Navigation buttons". 
        // Prompt says "Redirection: Each button must point to URL or support line". 
        // Prompt also lists "Redirection, URL or support line" as a general item 5.
        // I will keep rcs_redirectUrl as optional or remove if buttons cover it. 
        // Let's assume rcs_redirectUrl is for a fallback or main click.
        // Prompt: "Redirection: Each button must point to..." implies buttons handle redirection.
        // But earlier: "The message may include... Navigation buttons".
        // Let's keep rcs_redirectUrl as optional but validated if present.
        this.setValidators('rcs_redirectUrl', [Validators.pattern(/https?:\/\/.+/)]);
        
        // Initialize RCS buttons if empty? No, user adds them.
        this.updateRCSValidators(this.form.get('rcs_mediaType')?.value);
    }
    else if (solution === 'SAT_PUSH') {
        this.setValidators('sat_clientName', [Validators.required, Validators.pattern(/^[A-Z\s]+$/)]);
        this.setValidators('sat_messageText', [
            Validators.required,
            Validators.maxLength(160),
            this.satMessageValidator
        ]);
        this.setValidators('sat_url', [Validators.required, Validators.pattern(/https?:\/\/.+/)]);
        this.updateSatValidators(this.form.get('sat_isClickToCall')?.value);
    }
    else if (solution === 'PUSH_MULTIMEDIA') {
        this.setValidators('push_textLine1', [
            Validators.required,
            Validators.maxLength(25),
            this.pushTextLine1Validator
        ]);
        this.setValidators('push_textLine2', [Validators.maxLength(35)]);
        this.setValidators('push_url', [Validators.required, Validators.pattern(/https?:\/\/.+/)]);
        // UTM is optional
    }
    else if (solution === 'VIRTUAL_PRELOADS') {
        this.setValidators('vp_appName', [Validators.required]);
        this.setValidators('vp_clientName', [Validators.required]);
        this.setValidators('vp_playStoreUrl', [Validators.pattern(/https?:\/\/.+/)]);
        this.setValidators('vp_notificationText', [Validators.maxLength(50)]);
    }
    else if (solution === 'PRE_RECORDED_CALL') {
        this.setValidators('prc_clientName', [Validators.required]);
        this.updatePrcValidators();
    }
    else if (solution === 'WHATSAPP_BUSINESS') {
        this.setValidators('wa_fbMessengerId', [Validators.required]);
    }
    else if (solution === 'EMAIL_MARKETING') {
        this.setValidators('email_template', [Validators.required]);
        this.setValidators('email_colors', [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}(,\s*#[0-9A-Fa-f]{6})*$/)]);
        this.setValidators('email_fonts', [Validators.required]);
        this.setValidators('email_footer_info', [Validators.required]);
        this.setValidators('email_contact_emails', [Validators.required, Validators.email]); // Basic email validation for single email. If comma separated, need custom.
        // Assuming single email or comma separated? "Contact emails" (plural).
        // Let's use a pattern for comma separated emails or just required for now.
        // Simple required is safer if format is loose.
        this.setValidators('email_support_links', [Validators.pattern(/https?:\/\/.+/)]);
        this.setValidators('email_legal_text', [Validators.required]);
        this.setValidators('email_dnsConfig', [Validators.required]);
        this.setValidators('email_trackingUrls', [Validators.pattern(/https?:\/\/.+/)]);
    }
    // DATA REWARDS has no form controls to validate, but we check files on submit
    
    this.form.updateValueAndValidity();
  }

  updatePrcValidators() {
      const hasDtmf = this.form.get('prc_hasDtmf')?.value;
      if (hasDtmf) {
          this.setValidators('prc_dtmfOptions', [Validators.required]);
      } else {
          this.setValidators('prc_dtmfOptions', []);
      }

      const hasSms = this.form.get('prc_hasSms')?.value;
      if (hasSms) {
          this.setValidators('prc_smsText', [Validators.required, Validators.maxLength(200)]);
      } else {
          this.setValidators('prc_smsText', [Validators.maxLength(200)]); // Optional if checked? Usually if checked, it's required.
          // If unchecked, clear validators
          if (!hasSms) {
               this.setValidators('prc_smsText', []);
          }
      }
      this.form.updateValueAndValidity();
  }

  updateRCSValidators(mediaType: string) {
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

  updateSatValidators(isClickToCall: boolean) {
      if (isClickToCall) {
          this.setValidators('sat_phoneNumber', [Validators.required, Validators.pattern(/^\d{10}$/)]);
      } else {
          this.setValidators('sat_phoneNumber', [Validators.pattern(/^\d{10}$/)]); // Optional but valid if entered? Or just clear?
          // If not required, and empty, pattern validator passes. If not empty, it checks pattern.
      }
      this.form.updateValueAndValidity();
  }

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
            // Prompt says "written in uppercase". 
            // "Publicidad de (CLIENT NAME)" -> "PUBLICIDAD DE CLIENTNAME"? 
            // Or "Publicidad de CLIENTNAME"?
            // User Prompt: "The message text must begin with: “Publicidad de (CLIENT NAME)” written in uppercase."
            // This usually means the whole string "PUBLICIDAD DE CLIENTNAME".
            // Let's assume user meant "PUBLICIDAD DE [CLIENT NAME]" all caps.
            // Or "Publicidad de [CLIENT NAME]" where [CLIENT NAME] is uppercase?
            // "written in uppercase" applies to the whole phrase or just client name?
            // "The message text must begin with: “Publicidad de (CLIENT NAME)” written in uppercase."
            // I'll assume "PUBLICIDAD DE CLIENTNAME".
            
            // Wait, standard SAT PUSH messages in Latin America often use "Publicidad de NAME".
            // But "written in uppercase" likely applies to the whole prefix requirement.
            // Let's enforce "PUBLICIDAD DE " + clientName.
            const prefix = `PUBLICIDAD DE ${clientName}`;
            if (!value.startsWith(prefix)) {
                errors['invalidPrefix'] = true;
                errors['expectedPrefix'] = prefix;
            }
        } else {
             if (!value.startsWith("PUBLICIDAD DE ")) {
                 errors['invalidPrefix'] = true;
                 errors['expectedPrefix'] = "PUBLICIDAD DE (NOMBRE CLIENTE)";
            }
        }
    }
    
    return Object.keys(errors).length > 0 ? errors : null;
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

    if (this.selectedSolution() === 'RCS') {
        // Agent creation format required
        if (!this.form.get('rcs_agentData')?.value) {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Datos de Creación de Agente Google requeridos.' });
            return;
        }
        
        // Media type validations
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
    } else if (this.selectedSolution() === 'PUSH_MULTIMEDIA') {
        const banner = this.uploadedFiles.find(f => f.category === 'banner');
        const logo = this.uploadedFiles.find(f => f.category === 'logo');

        if (!banner) {
             this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Falta la imagen Banner (700x330 JPG).' });
             return;
        }
        if (!logo) {
             this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Falta la imagen Logo (96x96 JPG).' });
             return;
        }
    } else if (this.selectedSolution() === 'VIRTUAL_PRELOADS') {
        const icon = this.uploadedFiles.find(f => f.category === 'icon');
        const image = this.uploadedFiles.find(f => f.category === 'image');
        const apk = this.uploadedFiles.find(f => f.category === 'apk');

        if (!icon) {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Falta el Icono (256x256 px).' });
            return;
        }
        if (!image) {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Falta la Imagen (Aspecto 2:1).' });
            return;
        }

        // App Source Validation: Play URL OR APK
        const playUrl = this.form.get('vp_playStoreUrl')?.value;
        if (!playUrl && !apk) {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Debe proporcionar una URL de Play Store O subir un archivo APK.' });
            return;
        }
    } else if (this.selectedSolution() === 'EMAIL_MARKETING') {
        const logo = this.uploadedFiles.find(f => f.category === 'email_logo');
        if (!logo) {
             this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Falta el Logo (PNG/JPG, Máx 600px).' });
             return;
        }
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

  smsContentValidator = (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null; // Let required validator handle empty

    const errors: ValidationErrors = {};

    // 1. Forbidden characters: Accented (á, é, í, ó, ú), Opening punctuation (¿, ¡), ñ, Ñ
    if (/[áéíóúÁÉÍÓÚñÑ¡¿]/.test(value)) {
        errors['forbiddenChars'] = true;
    }

    // 2. Must include a destination URL
    if (!/https?:\/\/[^\s]+/.test(value)) {
        errors['missingUrl'] = true;
    }

    // 3. Must begin with client/brand name
    const formGroup = control.parent;
    if (formGroup) {
        const clientName = formGroup.get('sms_clientName')?.value;
        if (clientName && !value.startsWith(clientName)) {
            errors['doesNotStartWithBrand'] = true;
        }
    }

    return Object.keys(errors).length > 0 ? errors : null;
  }

  pushTextLine1Validator = (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;
      
      const errors: ValidationErrors = {};
      
      // Check prefix "Publicidad De:"
      // "Must include the prefix “Publicidad De:”"
      // Usually implies starts with.
      if (!value.startsWith("Publicidad De:")) {
          errors['invalidPrefix'] = true;
          errors['expectedPrefix'] = "Publicidad De:";
      }
      
      return Object.keys(errors).length > 0 ? errors : null;
  }


  validateVideoMetadata(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        let valid = true;
        const duration = video.duration;
        const width = video.videoWidth;
        const height = video.videoHeight;

        // Duration: 5s - 60s
        if (duration < 5 || duration > 60) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: `Duración del video inválida. Debe ser entre 5 y 60 segundos. (Actual: ${duration.toFixed(1)}s)` });
          valid = false;
        }

        // Resolution: 1920x1080
        if (width !== 1920 || height !== 1080) {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: `Resolución inválida. Debe ser 1920x1080. (Actual: ${width}x${height})` });
            valid = false;
        }

        resolve(valid);
      };
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al leer metadatos del video.' });
        resolve(false);
      };
      video.src = URL.createObjectURL(file);
    });
  }

  async onUpload(event: any, category: string = 'general') {
      this.isUploading.set(true);
      const files = event.files;
      const folderPath = `production-requests/${this.config.data?.request?.id || 'temp'}/material-prep`;
      
      try {
          // If PUSH_MULTIMEDIA, check dimensions first
      if (this.selectedSolution() === 'PUSH_MULTIMEDIA') {
         for (const file of files) {
             const isValid = await this.validateImageDimensions(file, category);
             if (!isValid) {
                 this.isUploading.set(false);
                 return; // Stop upload if dimension check fails
             }
         }
      }
      
      // EMAIL MARKETING Validations
      if (this.selectedSolution() === 'EMAIL_MARKETING') {
        for (const file of files) {
            const isValid = await this.validateImageDimensions(file, category);
            if (!isValid) {
                this.isUploading.set(false);
                return;
            }
        }
      }

      // VIRTUAL PRELOADS Validations
      if (this.selectedSolution() === 'VIRTUAL_PRELOADS') {
        for (const file of files) {
             if (category === 'icon' || category === 'image') {
                 const isValid = await this.validateImageDimensions(file, category);
                 if (!isValid) {
                     this.isUploading.set(false);
                     return;
                 }
             }
        }
      }

      // DATA REWARDS Validations
      if (this.selectedSolution() === 'DATA_REWARDS') {
        for (const file of files) {
            const isValid = await this.validateVideoMetadata(file);
            if (!isValid) {
                this.isUploading.set(false);
                return;
            }
        }
      }

          const results = await this.azureService.uploadFiles(files, {
              folderPath: folderPath,
              containerName: 'private' 
          });

          results.forEach(res => {
              if (res.success) {
                  // Check if we already have a file of this category for PUSH_MULTIMEDIA and replace it
                  if (this.selectedSolution() === 'PUSH_MULTIMEDIA') {
                      const index = this.uploadedFiles.findIndex(f => f.category === category);
                      if (index !== -1) {
                          this.uploadedFiles.splice(index, 1);
                      }
                  }

                  // VIRTUAL PRELOADS Replace existing file of same category
                  if (this.selectedSolution() === 'VIRTUAL_PRELOADS') {
                      const index = this.uploadedFiles.findIndex(f => f.category === category);
                      if (index !== -1) {
                          this.uploadedFiles.splice(index, 1);
                      }
                  }

                  // EMAIL MARKETING Replace existing Logo
                  if (this.selectedSolution() === 'EMAIL_MARKETING' && category === 'email_logo') {
                      const index = this.uploadedFiles.findIndex(f => f.category === 'email_logo');
                      if (index !== -1) {
                          this.uploadedFiles.splice(index, 1);
                      }
                  }

                  // DATA REWARDS Replace existing video (Single file allowed usually? Or multiple? Prompt says "Video Requirements" singular format but implies "files")
                  // "Por favor suba el video o los recursos"
                  // Let's assume single video for Data Rewards based on "The video" phrasing.
                  if (this.selectedSolution() === 'DATA_REWARDS') {
                      const index = this.uploadedFiles.findIndex(f => f.category === category);
                      if (index !== -1) {
                          this.uploadedFiles.splice(index, 1);
                      }
                  }

                  this.uploadedFiles.push({
                      name: res.fileName,
                      url: res.url,
                      type: 'file',
                      category: category 
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

  validateImageDimensions(file: File, category: string): Promise<boolean> {
      return new Promise((resolve) => {
          const img = new Image();
          img.src = URL.createObjectURL(file);
          img.onload = () => {
              let valid = true;
              if (category === 'banner') {
                  // 700x330
                  if (img.width !== 700 || img.height !== 330) {
                      this.messageService.add({ severity: 'error', summary: 'Error', detail: `Banner debe ser 700x330 px. (Actual: ${img.width}x${img.height})` });
                      valid = false;
                  }
              } else if (category === 'logo') {
                  // 96x96
                  if (img.width !== 96 || img.height !== 96) {
                      this.messageService.add({ severity: 'error', summary: 'Error', detail: `Logo debe ser 96x96 px. (Actual: ${img.width}x${img.height})` });
                      valid = false;
                  }
              } else if (category === 'icon') {
                  // 256x256
                  if (img.width !== 256 || img.height !== 256) {
                      this.messageService.add({ severity: 'error', summary: 'Error', detail: `Icono debe ser 256x256 px. (Actual: ${img.width}x${img.height})` });
                      valid = false;
                  }
              } else if (category === 'image') {
                  // Aspect ratio 2:1
                  const ratio = img.width / img.height;
                  // Allow small tolerance? No, prompt says exact or ratio.
                  // "Relación de aspecto 2:1 (ej. 1024x512)"
                  // Let's use a small tolerance for floating point
                  if (Math.abs(ratio - 2) > 0.01) {
                      this.messageService.add({ severity: 'error', summary: 'Error', detail: `Imagen debe tener relación de aspecto 2:1 (ej. 1024x512). (Actual: ${img.width}x${img.height})` });
                      valid = false;
                  }
              } else if (category === 'email_logo' || category === 'email_graphics') {
                  // Max width 600px
                  if (img.width > 600) {
                      this.messageService.add({ severity: 'error', summary: 'Error', detail: `La imagen no debe exceder 600px de ancho. (Actual: ${img.width}px)` });
                      valid = false;
                  }
              }
              URL.revokeObjectURL(img.src);
              resolve(valid);
          };
          img.onerror = () => {
              this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al leer imagen.' });
              resolve(false);
          };
      });
  }
}

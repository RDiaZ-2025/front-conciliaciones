import { LucideIconComponent } from '../../../components/lucide-icon/lucide-icon.component';
import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, BehaviorSubject } from 'rxjs';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { MenuItem, MessageService } from 'primeng/api';
import { StepsModule } from 'primeng/steps';
import { ProductionRequest } from '../../../models/common/production-request';
import { UploadedFile } from '../../../models/common/uploaded-file';
import { Team } from '../../../models/common/team';
import { CustomerData } from '../../../models/common/customer-data';
import { AudienceData } from '../../../models/common/audience-data';
import { CampaignDetail } from '../../../models/common/campaign-detail';
import { ProductionInfo } from '../../../models/common/production-info';
import { Product } from '../../../models/common/product';
import { Objective } from '../../../models/common/objective';
import { Gender } from '../../../models/common/gender';
import { AgeRange } from '../../../models/common/age-range';
import { SocioeconomicLevel } from '../../../models/common/socioeconomic-level';
import { FormatType } from '../../../models/common/format-type';
import { RightsDuration } from '../../../models/common/rights-duration';
import { Status } from '../../../models/common/status';
import { WORKFLOW_STAGES } from '../../../models/common/workflow-stage';
import { AzureStorageService } from '../../../services/azure-storage.service';
import { TeamService } from '../../../services/team.service';
import { User, UserService } from '../../../services/user.service';
import { ProductionService } from '../../../services/production.service';
import { AuthService } from '../../../services/auth.service';
import { HolidayService } from '../../../services/holiday.service';
import { DialogModule } from 'primeng/dialog';
import { ProductionStepGeneralComponent } from '../production-steps/production-step-general/production-step-general.component';
import { ProductionStepCustomerComponent } from '../production-steps/production-step-customer/production-step-customer.component';
import { ProductionStepCampaignComponent } from '../production-steps/production-step-campaign/production-step-campaign.component';
import { ProductionStepAudienceComponent } from '../production-steps/production-step-audience/production-step-audience.component';
import { ProductionStepProductionComponent } from '../production-steps/production-step-production/production-step-production.component';

@Component({
  selector: 'app-production-dialog',
  standalone: true,
  imports: [
    LucideIconComponent,
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    StepsModule,
    DialogModule,
    ProductionStepGeneralComponent,
    ProductionStepCustomerComponent,
    ProductionStepCampaignComponent,
    ProductionStepAudienceComponent,
    ProductionStepProductionComponent
  ],
  providers: [MessageService],
  templateUrl: './production-dialog.component.html',
  styleUrl: './production-dialog.component.scss'
})
export class ProductionDialogComponent implements OnInit {
  fb = inject(FormBuilder);
  ref = inject(DynamicDialogRef);
  config = inject(DynamicDialogConfig);
  azureService = inject(AzureStorageService);
  messageService = inject(MessageService);

  campaignObjectives: Objective[] = [];
  genders: Gender[] = [];
  ageRanges: AgeRange[] = [];
  socioeconomicLevels: SocioeconomicLevel[] = [];
  formatTypes: FormatType[] = [];
  rightsDurations: RightsDuration[] = [];

  constructor() {
  }
  teamService = inject(TeamService);
  productionService = inject(ProductionService);
  authService = inject(AuthService);
  holidayService = inject(HolidayService);
  userService = inject(UserService);
  cd = inject(ChangeDetectorRef);

  form!: FormGroup;
  isEditMode = false;
  isReadonly = false;
  canEditCore = true;
  isAssignedUser = false;
  loadedRequest: ProductionRequest | null = null;

  uploadedFiles: any[] = [];
  selectedFiles: File[] = [];
  existingFiles: UploadedFile[] = [];
  isUploading$ = new BehaviorSubject<boolean>(false);
  minDate: Date = new Date();
  teams$ = new BehaviorSubject<Team[]>([]);
  assignedUsers$ = new BehaviorSubject<User[]>([]);
  products$ = new BehaviorSubject<Product[]>([]);
  workflowStages: { id: string | number, label: string }[] = [];

  showSuccessModal = false;
  createdRequestId: string | number = '';
  createdTeam: string = '';
  createdUserId: string | number = '';
  createdUserName: string = '';
  finalResult: any = null;

  items: MenuItem[] = [];
  currentStep: number = 0;

  ngOnInit() {
    this.isEditMode = !!this.config.data?.id;
    this.isReadonly = !!this.config.data?.readonly;
    const data = this.config.data || {};

    this.loadObjectives();
    this.loadAudienceOptions();
    this.loadProductionOptions();
    this.loadStatuses();

    if (data.files) {
      this.existingFiles = [...data.files];
    }

    if (this.isEditMode && data.id) {
      this.loadedRequest = data as ProductionRequest;
    }

    if (this.isEditMode && this.config.data.id) {
      this.loadFilesFromStorage(this.config.data.id);
    }

    this.items = [
      { label: 'Solicitud' },
      { label: 'Cliente' },
      { label: 'Campaña' },
      { label: 'Audiencia' },
      { label: 'Producción' }
    ];

    this.form = this.fb.group({
      name: [data.name || '', Validators.required],
      department: [data.department || '', Validators.required],
      assignedUserId: [data.assignedUserId || null],
      observations: [data.observations || ''],
      status: [data.status || 'quotation', Validators.required],

      customerData: this.fb.group({
        clientAgency: [data.customerData?.clientAgency || '', Validators.required],
        requesterName: [data.customerData?.requesterName || '', Validators.required],
        requesterEmail: [data.customerData?.requesterEmail || '', [Validators.required, Validators.email]],
        requesterPhone: [data.customerData?.requesterPhone || ''],
        businessName: [data.customerData?.businessName || '', Validators.required],
        nit: [data.customerData?.nit || '', Validators.required]
      }),

      audienceData: this.fb.group({
        genderId: [data.audienceData?.genderId || null, Validators.required],
        geo: [data.audienceData?.geo || '', Validators.required],
        ageRangeId: [data.audienceData?.ageRangeId || null, Validators.required],
        socioEconomicLevelId: [data.audienceData?.socioEconomicLevelId || null, Validators.required],
        interests: [data.audienceData?.interests || '', Validators.required],
        specificDetails: [data.audienceData?.specificDetails || '', Validators.required],
        campaignContext: [data.audienceData?.campaignContext || '', Validators.required],
        campaignConcept: [data.audienceData?.campaignConcept || ''],
        assets: [data.audienceData?.assets || '']
      }),

      campaignDetail: this.fb.group({
        budget: [data.campaignDetail?.budget || '', Validators.required],
        brand: [data.campaignDetail?.brand || ''],
        productService: [data.campaignDetail?.productService || '', Validators.required],
        objectiveId: [data.campaignDetail?.objectiveId || null, Validators.required],
        campaignProducts: this.fb.array([])
      }),

      productionInfo: this.fb.group({
        formatTypeId: [data.productionInfo?.formatTypeId || null, Validators.required],
        rightsDurationId: [data.productionInfo?.rightsDurationId || null, Validators.required],
        communicationTone: [data.productionInfo?.communicationTone || '', Validators.required],
        ownAndExternalMedia: [data.productionInfo?.ownAndExternalMedia || ''],
        tvFormats: [data.productionInfo?.tvFormats || '', Validators.required],
        digitalFormats: [data.productionInfo?.digitalFormats || '', Validators.required],
        productionDetails: [data.productionInfo?.productionDetails || '', Validators.required],
        additionalComments: [data.productionInfo?.additionalComments || '']
      })
    });

    this.loadTeams();

    if (!this.isEditMode) {
      const currentUser = this.authService.currentUser();
      if (currentUser) {
        if (currentUser.id) {
          this.form.patchValue({ assignedUserId: currentUser.id });
        }

        const userTeams = (currentUser as any).teams as string[];
        if (userTeams && userTeams.length > 0) {
          const teamName = userTeams[0];
          this.form.patchValue({ department: teamName });
          this.form.get('department')?.disable();
        }
      }
    }

    this.teams$.subscribe(teams => {
    });

    this.loadProducts();

    if (this.isEditMode) {
      this.productionService.getProductionRequest(this.config.data.id).subscribe({
        next: (response: any) => {
          const fullData = response.data || response;
          this.loadedRequest = fullData;

          if (this.isReadonly) {
            this.form.disable();
          }

          if (fullData.deliveryDate) fullData.deliveryDate = new Date(fullData.deliveryDate);
          if (fullData.productionInfo?.campaignEmissionDate) {
            fullData.productionInfo.campaignEmissionDate = new Date(fullData.productionInfo.campaignEmissionDate);
          }

          this.form.patchValue(fullData);

          this.checkPermissions(fullData);

          this.campaignProducts.clear();
          if (fullData.campaignDetail?.campaignProducts && fullData.campaignDetail.campaignProducts.length > 0) {
            fullData.campaignDetail.campaignProducts.forEach((cp: any) => this.addCampaignProduct(cp));
          } else {
            this.addCampaignProduct();
          }

          if (fullData.files) {
            if (this.existingFiles.length === 0) {
              setTimeout(() => {
                this.existingFiles = fullData.files;
                this.cd.detectChanges();
              });
            }
          }
        },
        error: (error: any) => {
          console.error('Error loading full request details', error);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los detalles de la solicitud' });
        }
      });
    } else {
      if (data.campaignDetail?.campaignProducts) {
        data.campaignDetail.campaignProducts.forEach((cp: any) => this.addCampaignProduct(cp));
      } else if (this.campaignProducts.length === 0) {
        this.addCampaignProduct();
      }
    }

    this.setupValueChanges();
  }

  get campaignProducts() {
    return (this.form.get('campaignDetail') as FormGroup).get('campaignProducts') as FormArray;
  }

  addCampaignProduct(data?: any) {
    const productGroup = this.fb.group({
      id: [data?.id || null],
      productId: [data?.productId || null, Validators.required],
      quantity: [data?.quantity || '', Validators.required]
    });
    this.campaignProducts.push(productGroup);
  }

  removeCampaignProduct(index: number) {
    this.campaignProducts.removeAt(index);
  }

  loadProducts() {
    this.productionService.getProducts().subscribe({
      next: (products) => {
        this.products$.next(products);
      },
      error: (error) => {
        console.error('Error loading products', error);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los productos' });
      }
    });
  }

  loadObjectives() {
    this.productionService.getObjectives().subscribe({
      next: (objectives) => {
        this.campaignObjectives = objectives;
      },
      error: (error) => {
        console.error('Error loading objectives', error);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los objetivos de campaña' });
      }
    });
  }

  loadProductionOptions() {
    this.productionService.getFormatTypes().subscribe({
      next: (data) => {
        this.formatTypes = data;
      },
      error: (error) => {
        console.error('Error loading format types', error);
      }
    });

    this.productionService.getRightsDurations().subscribe({
      next: (data) => {
        this.rightsDurations = data;
      },
      error: (error) => {
        console.error('Error loading rights durations', error);
      }
    });
  }

  loadAudienceOptions() {
    this.productionService.getGenders().subscribe({
      next: (data) => this.genders = data,
      error: (error) => console.error('Error loading genders', error)
    });
    this.productionService.getAgeRanges().subscribe({
      next: (data) => this.ageRanges = data,
      error: (error) => console.error('Error loading age ranges', error)
    });
    this.productionService.getSocioeconomicLevels().subscribe({
      next: (data) => this.socioeconomicLevels = data,
      error: (error) => console.error('Error loading socioeconomic levels', error)
    });
  }

  loadStatuses() {
    this.productionService.getWorkflowStages().subscribe({
      next: (stages) => {
        this.workflowStages = stages;
      },
      error: (error) => {
        console.error('Error loading workflow stages', error);
      }
    });
  }

  loadFilesFromStorage(requestId: number) {
    const folderPath = AzureStorageService.generateProductionRequestFolderPath(requestId.toString());
    this.azureService.listFiles(folderPath, 'private').then(blobs => {
      this.existingFiles = blobs.map(blobName => {
        const fileName = blobName.split('/').pop() || blobName;
        return {
          id: blobName,
          name: fileName,
          size: 0,
          type: 'application/octet-stream',
          uploadDate: new Date().toISOString()
        };
      });
      this.cd.detectChanges();
    }).catch(err => {
      console.error('Error loading files from storage:', err);
    });
  }

  setupValueChanges() {
  }

  loadTeams() {
    this.teamService.getTeams().subscribe({
      next: (response) => {
        if (response.success) {
          this.teams$.next(response.data);
        }
      },
      error: (error) => {
        console.error('Error loading teams', error);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los equipos' });
      }
    });
  }

  onFileSelect(event: any) {
    const files = event.files || [];
    this.selectedFiles = [...this.selectedFiles, ...files];
  }

  onFileRemove(event: any) {
    const removedName = event.file?.name;
    if (removedName) {
      this.selectedFiles = this.selectedFiles.filter(f => f.name !== removedName);
    }
  }

  onFileClear() {
    this.selectedFiles = [];
  }

  isCurrentStepEnabled(): boolean {
    switch (this.currentStep) {
      case 0:
        return !this.form.get('name')?.disabled || !this.form.get('department')?.disabled;
      case 1:
        return !this.form.get('customerData')?.disabled;
      case 2:
        return !this.form.get('campaignDetail')?.disabled;
      case 3:
        return !this.form.get('audienceData')?.disabled;
      case 4:
        return !this.form.get('productionInfo')?.disabled;
      default:
        return false;
    }
  }

  next() {
    let isValid = false;
    const stepEnabled = this.isCurrentStepEnabled();

    switch (this.currentStep) {
      case 0:
        const mainControls = ['name', 'department'];
        isValid = mainControls.every(key => {
          const control = this.form.get(key);
          return control?.valid || control?.disabled;
        });

        if (!this.canEditCore && this.isAssignedUser) {
          const statusControl = this.form.get('status');
          isValid = isValid && (statusControl?.valid ?? true);
          if (!isValid && statusControl?.invalid) statusControl?.markAsDirty();
        }

        if (!isValid) {
          mainControls.forEach(key => this.form.get(key)?.markAsDirty());
        }
        break;
      case 1:
        const customerGroup = this.form.get('customerData') as FormGroup;
        isValid = customerGroup.disabled || customerGroup.valid;
        if (!isValid) customerGroup.markAllAsTouched();
        break;
      case 2:
        const campaignGroup = this.form.get('campaignDetail') as FormGroup;
        isValid = campaignGroup.disabled || campaignGroup.valid;
        if (!isValid) campaignGroup.markAllAsTouched();
        break;
      case 3:
        const audienceGroup = this.form.get('audienceData') as FormGroup;
        isValid = audienceGroup.disabled || audienceGroup.valid;
        if (!isValid) audienceGroup.markAllAsTouched();
        break;
      case 4:
        const prodInfo = this.form.get('productionInfo') as FormGroup;
        isValid = prodInfo.disabled || prodInfo.valid;
        if (!isValid) prodInfo.markAllAsTouched();
        break;
    }

    if (isValid) {
      if (stepEnabled) {
        this.saveData(false);
      } else {
        this.currentStep++;
      }
    } else {
      this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'Por favor complete todos los campos requeridos' });
    }
  }

  prev() {
    if (this.currentStep > 0) {
      this.currentStep--;
    }
  }

  checkPermissions(data: ProductionRequest) {
    if (this.isReadonly) {
      this.canEditCore = false;
      this.form.disable();
      this.enableIncompleteSteps(data);
      return;
    }

    const user = this.authService.currentUser();
    if (!user) return;

    const isAdmin = user.permissions?.some(p => p.toLowerCase() === 'admin');
    const isSupervisor = user.permissions?.some(p => p.toLowerCase() === 'supervisor');

    this.isAssignedUser = String(user.id) === String(data.assignedUserId);

    if (isAdmin || isSupervisor) {
      this.canEditCore = true;
      this.form.enable();
    } else if (this.isAssignedUser) {
      this.canEditCore = false;
      this.applyRestrictedMode();
      this.enableIncompleteSteps(data);
    } else {
      this.canEditCore = false;
      this.form.disable();
      this.enableIncompleteSteps(data);
    }
    this.cd.detectChanges();
  }

  enableIncompleteSteps(data: ProductionRequest) {
    // Enable form groups to check validity based on current values
    const customerGroup = this.form.get('customerData');
    customerGroup?.enable();
    if (customerGroup?.valid && data.customerData && Object.keys(data.customerData).length > 0) {
      customerGroup?.disable();
    }

    const campaignGroup = this.form.get('campaignDetail');
    campaignGroup?.enable();
    if (campaignGroup?.valid && data.campaignDetail && Object.keys(data.campaignDetail).length > 0) {
      campaignGroup?.disable();
    }

    const audienceGroup = this.form.get('audienceData');
    audienceGroup?.enable();
    if (audienceGroup?.valid && data.audienceData && Object.keys(data.audienceData).length > 0) {
      audienceGroup?.disable();
    }

    const prodInfoGroup = this.form.get('productionInfo');
    prodInfoGroup?.enable();
    if (prodInfoGroup?.valid && data.productionInfo && Object.keys(data.productionInfo).length > 0) {
      prodInfoGroup?.disable();
    }
  }

  applyRestrictedMode() {
    this.form.disable();
    this.form.get('observations')?.enable();
    this.form.get('status')?.enable();
    this.form.get('department')?.enable();
    this.form.get('assignedUserId')?.enable();

    const productionInfo = this.form.get('productionInfo') as FormGroup;
    if (productionInfo) {
      productionInfo.get('productionDetails')?.enable();
      productionInfo.get('additionalComments')?.enable();
    }
  }

  async saveData(closeOnComplete: boolean = false) {
    if (this.isUploading$.value) {
      return;
    }

    let isValid = true;
    if (closeOnComplete) {
      if (!this.canEditCore && this.isAssignedUser) {
        const statusValid = this.form.get('status')?.valid ?? true;
        const prodInfo = this.form.get('productionInfo') as FormGroup;
        const prodDetailsValid = prodInfo?.disabled || (prodInfo?.get('productionDetails')?.valid ?? true);

        if (!statusValid || !prodDetailsValid) {
          isValid = false;
          if (!statusValid) this.form.get('status')?.markAsDirty();
          if (!prodDetailsValid) prodInfo?.get('productionDetails')?.markAsDirty();
        }
      } else {
        // If some steps are enabled (incomplete), we just need to make sure the enabled parts are valid.
        // If the whole form is disabled, it will be valid.
        // We can just use this.form.valid, but if we want to only check enabled controls:
        // Angular forms consider a form group valid if all its enabled controls are valid.
        isValid = this.form.valid;
      }
    } else {
      isValid = true;
    }

    if (!isValid) {
      this.form.markAllAsTouched();
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Por favor complete todos los campos requeridos en todos los pasos' });
      return;
    }

    this.isUploading$.next(true);
    const formValue = this.form.getRawValue();

    let forcedStage: string | undefined;

    if (!this.isEditMode) {
      const targetStageCode = 'quotation';
      forcedStage = targetStageCode;
      formValue.status = targetStageCode;
    } else if (this.currentStep === 2) {
      const budgetStr = formValue.campaignDetail?.budget || '0';
      const cleanBudget = String(budgetStr).replace(/[^0-9]/g, '');
      const budget = parseFloat(cleanBudget);

      let targetStageCode = 'create_proposal';
      if (budget < 50000000) {
        targetStageCode = 'get_data';
      }

      let currentDate = new Date();
      let daysToAdd = 0;

      if (budget < 50000000) {
        daysToAdd = 2;
      } else if (budget >= 50000000 && budget <= 100000000) {
        daysToAdd = 3;
      } else if (budget > 100000000 && budget <= 200000000) {
        daysToAdd = 4;
      } else {
        daysToAdd = 7;
      }

      let holidays: string[] = [];
      try {
        holidays = await this.holidayService.getHolidaysForDateRange(currentDate);
      } catch (error) {
        console.error(error);
      }

      const isHoliday = (date: Date) => this.holidayService.isHoliday(date, holidays);

      const currentHour = currentDate.getHours();
      if (currentHour >= 17) {
        currentDate.setDate(currentDate.getDate() + 1);
        currentDate.setHours(7, 0, 0, 0);
      } else if (currentHour < 7) {
        currentDate.setHours(7, 0, 0, 0);
      }

      while (currentDate.getDay() === 0 || currentDate.getDay() === 6 || isHoliday(currentDate)) {
        currentDate.setDate(currentDate.getDate() + 1);
        currentDate.setHours(7, 0, 0, 0);
      }

      while (daysToAdd > 0) {
        currentDate.setDate(currentDate.getDate() + 1);
        if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6 && !isHoliday(currentDate)) {
          daysToAdd--;
        }
      }

      formValue.deliveryDate = currentDate;

      const currentStatus = this.loadedRequest?.status || formValue.status;
      const currentStageIndex = WORKFLOW_STAGES.findIndex(s => s.id === currentStatus);
      const inSellIndex = WORKFLOW_STAGES.findIndex(s => s.id === 'in_sell');
      const isEarlyStage = currentStageIndex === -1 || currentStageIndex <= inSellIndex;

      if (!currentStatus || isEarlyStage) {
        forcedStage = targetStageCode;
        formValue.status = targetStageCode;
      }
    } else if (!formValue.status) {
      formValue.status = 'quotation';
    }

    const productionInfo = formValue.productionInfo ? { ...formValue.productionInfo } : undefined;
    if (productionInfo && productionInfo.campaignEmissionDate instanceof Date) {
      productionInfo.campaignEmissionDate = productionInfo.campaignEmissionDate.toISOString();
    }

    const fullPayload: Partial<ProductionRequest> = {
      ...this.loadedRequest,
      ...this.config.data,
      ...formValue,
      deliveryDate: formValue.deliveryDate ? (formValue.deliveryDate instanceof Date ? formValue.deliveryDate.toISOString() : new Date(formValue.deliveryDate).toISOString()) : undefined,
      productionInfo: productionInfo
    };

    if (forcedStage) {
      fullPayload.stage = forcedStage;
    }

    if (fullPayload.campaignDetail?.campaignProducts) {
      const validProducts = fullPayload.campaignDetail.campaignProducts.filter((p: any) => p.productId !== null && p.productId !== undefined);

      fullPayload.campaignDetail.campaignProducts = validProducts.map((p: any) => {
        const cleanP = { ...p };
        if (cleanP.id === null || cleanP.id === undefined) delete cleanP.id;
        return cleanP;
      });
    }

    const afterPersist = (saved: ProductionRequest | any) => {
      const actualData = saved.data || saved;

      const requestId =
        actualData?.id ??
        actualData?.Id ??
        actualData?.requestId ??
        actualData?.RequestId ??
        this.config.data?.id;

      if (!requestId) {
        console.error('Could not determine request ID from response', saved);
        this.isUploading$.next(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo obtener el ID de la solicitud para subir los archivos' });
        return;
      }

      if (!this.isEditMode) {
        this.isEditMode = true;
        this.config.data.id = requestId;
        this.loadedRequest = actualData;
      }

      const folderPath = AzureStorageService.generateProductionRequestFolderPath(requestId);

      if (this.selectedFiles.length === 0) {
        this.isUploading$.next(false);
        const result: Partial<ProductionRequest> = {
          ...saved,
          files: [...this.existingFiles]
        };
        if (closeOnComplete) {
          this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Solicitud guardada correctamente' });
          this.createdRequestId = requestId;
          this.createdTeam = actualData?.department || formValue.department;
          this.createdUserId = actualData?.assignedUserId || formValue.assignedUserId || 'N/A';
          this.finalResult = result;
          this.showSuccessModal = true;
          this.fetchUserName(this.createdUserId);
          this.cd.detectChanges();
        } else {
          this.currentStep++;
          this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Progreso guardado correctamente' });
          this.cd.detectChanges();
        }
        return;
      }

      this.azureService.uploadFiles(this.selectedFiles, {
        folderPath,
        containerName: 'private',
        metadata: {
          requestId: requestId.toString(),
          uploadType: 'production'
        }
      }).then(results => {
        console.log('Upload results:', results);
        const newFiles: UploadedFile[] = results.map((r, index) => ({
          id: `${folderPath}/${r.fileName}`,
          name: r.fileName,
          size: this.selectedFiles[index].size,
          type: this.selectedFiles[index].type,
          url: r.url,
          uploadDate: new Date().toISOString()
        }));

        const mergedFiles = [...this.existingFiles, ...newFiles];
        this.existingFiles = mergedFiles;
        this.selectedFiles = [];

        this.productionService.updateProductionRequest(requestId, { files: mergedFiles }).subscribe({
          next: (updated) => {
            this.isUploading$.next(false);
            if (closeOnComplete) {
              this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Solicitud guardada y archivos cargados' });
              this.createdRequestId = requestId;
              const updatedData = (updated as any).data || updated;
              this.createdTeam = updatedData?.department || actualData?.department || formValue.department;
              this.createdUserId = updatedData?.assignedUserId || actualData?.assignedUserId || formValue.assignedUserId || 'N/A';
              this.finalResult = { ...updated, files: mergedFiles };
              this.showSuccessModal = true;
              this.fetchUserName(this.createdUserId);
              this.cd.detectChanges();
            } else {
              this.currentStep++;
              this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Progreso guardado y archivos subidos' });
              this.cd.detectChanges();
            }
          },
          error: () => {
            this.isUploading$.next(false);
            this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'Archivos cargados, pero no se pudieron vincular en la solicitud' });
            if (closeOnComplete) {
              this.createdRequestId = requestId;
              this.createdTeam = actualData?.department || formValue.department;
              this.createdUserId = actualData?.assignedUserId || formValue.assignedUserId || 'N/A';
              this.finalResult = { ...saved, files: mergedFiles };
              this.showSuccessModal = true;
              this.fetchUserName(this.createdUserId);
              this.cd.detectChanges();
            } else {
              this.currentStep++;
              this.cd.detectChanges();
            }
          }
        });
      }).catch((err) => {
        console.error('Upload error:', err);
        this.isUploading$.next(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los archivos' });
      });
    };

    let request$: Observable<ProductionRequest>;

    if (this.isEditMode && this.config.data?.id) {
      const requestId = this.config.data.id;
      switch (this.currentStep) {
        case 0:
          const generalData = {
            name: formValue.name,
            department: formValue.department,
            assignedUserId: formValue.assignedUserId,
            observations: formValue.observations,
            status: formValue.status
          };
          request$ = this.productionService.updateStepGeneral(requestId, generalData);
          break;
        case 1:
          request$ = this.productionService.updateStepCustomer(requestId, formValue.customerData);
          break;
        case 2:
          const campaignDetail = { ...formValue.campaignDetail };
          if (campaignDetail.campaignProducts) {
            campaignDetail.campaignProducts = campaignDetail.campaignProducts.map((p: any) => {
              const cleanP = { ...p };
              if (cleanP.id === null || cleanP.id === undefined) delete cleanP.id;
              return cleanP;
            });
          }
          request$ = this.productionService.updateStepCampaign(requestId, campaignDetail, formValue.status, formValue.deliveryDate ? (formValue.deliveryDate instanceof Date ? formValue.deliveryDate.toISOString() : new Date(formValue.deliveryDate).toISOString()) : undefined);
          break;
        case 3:
          request$ = this.productionService.updateStepAudience(requestId, formValue.audienceData);
          break;
        case 4:
          request$ = this.productionService.updateStepProduction(requestId, productionInfo);
          break;
        default:
          request$ = this.productionService.updateProductionRequest(requestId, fullPayload);
      }
    } else {
      request$ = this.productionService.createProductionRequest(fullPayload);
    }

    request$.subscribe({
      next: (saved) => afterPersist(saved),
      error: () => {
        this.isUploading$.next(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar la solicitud' });
      }
    });
  }

  async downloadFile(file: UploadedFile) {
    try {
      this.messageService.add({ severity: 'info', summary: 'Info', detail: 'Descargando archivo...' });
      await this.azureService.downloadSingleFile(file.id, file.name);
      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Archivo descargado' });
    } catch (error) {
      console.error('Download error:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo descargar el archivo' });
    }
  }

  cancel() {
    this.ref.close();
  }

  removeFile(file: UploadedFile) {
    this.existingFiles = this.existingFiles.filter(f => f.id !== file.id);
    this.uploadedFiles = this.uploadedFiles.filter(f => f.id !== file.id);
  }

  fetchUserName(userId: string | number) {
    if (!userId || userId === 'N/A') return;
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        const user = users.find(u => String(u.id) === String(userId));
        if (user) {
          this.createdUserName = user.name;
          this.cd.detectChanges();
        }
      },
      error: (err) => console.error('Error fetching user for success modal', err)
    });
  }

  closeDialogAfterSuccess() {
    this.showSuccessModal = false;
    this.ref.close(this.finalResult);
  }
}

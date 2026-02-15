import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, BehaviorSubject } from 'rxjs';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { MenuItem, MessageService } from 'primeng/api';
import { StepsModule } from 'primeng/steps';
import { ProductionRequest, UploadedFile, Team, CustomerData, AudienceData, CampaignDetail, ProductionInfo, Product, Objective, Gender, AgeRange, SocioeconomicLevel, FormatType, RightsDuration, Status, WORKFLOW_STAGES } from '../../production.models';
import { AzureStorageService } from '../../../../services/azure-storage.service';
import { TeamService } from '../../../../services/team.service';
import { User } from '../../../../services/user.service';
import { ProductionService } from '../../../../services/production.service';
import { AuthService } from '../../../../services/auth.service';
import { ProductionStepGeneralComponent } from '../production-steps/production-step-general/production-step-general.component';
import { ProductionStepCustomerComponent } from '../production-steps/production-step-customer/production-step-customer.component';
import { ProductionStepCampaignComponent } from '../production-steps/production-step-campaign/production-step-campaign.component';
import { ProductionStepAudienceComponent } from '../production-steps/production-step-audience/production-step-audience.component';
import { ProductionStepProductionComponent } from '../production-steps/production-step-production/production-step-production.component';

@Component({
  selector: 'app-production-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    StepsModule,
    ProductionStepGeneralComponent,
    ProductionStepCustomerComponent,
    ProductionStepCampaignComponent,
    ProductionStepAudienceComponent,
    ProductionStepProductionComponent
  ],
  providers: [MessageService],
  templateUrl: './production-dialog.html',
  styleUrl: './production-dialog.scss'
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
    // Auto-save setup is handled in setupValueChanges
  }
  teamService = inject(TeamService);
  productionService = inject(ProductionService);
  authService = inject(AuthService);
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

    // Initialize files from passed data immediately (fallback if storage fails)
    if (data.files) {
      this.existingFiles = [...data.files];
    }

    // Initialize loadedRequest from passed data to ensure we have base fields immediately
    if (this.isEditMode && data.id) {
      this.loadedRequest = data as ProductionRequest;
    }

    // Load files from Azure Storage if in Edit Mode
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
      // Step 1: General Request
      name: [data.name || '', Validators.required],
      department: [data.department || '', Validators.required],
      contactPerson: [data.contactPerson || '', Validators.required],
      assignedUserId: [data.assignedUserId || null],
      deliveryDate: [data.deliveryDate ? new Date(data.deliveryDate) : null, Validators.required],
      observations: [data.observations || ''],
      status: [data.status || 'request', Validators.required],

      // Step 2: Customer Information
      customerData: this.fb.group({
        clientAgency: [data.customerData?.clientAgency || '', Validators.required],
        requesterName: [data.customerData?.requesterName || '', Validators.required],
        requesterEmail: [data.customerData?.requesterEmail || '', [Validators.required, Validators.email]],
        requesterPhone: [data.customerData?.requesterPhone || ''],
        businessName: [data.customerData?.businessName || '', Validators.required],
        nit: [data.customerData?.nit || '', Validators.required],
        serviceStrategy: [data.customerData?.serviceStrategy || false],
        serviceTactical: [data.customerData?.serviceTactical || false],
        serviceProduction: [data.customerData?.serviceProduction || false],
        serviceData: [data.customerData?.serviceData || false]
      }),

      // Step 3: Audience Details
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

      // Step 4: Campaign Details
      campaignDetail: this.fb.group({
        budget: [data.campaignDetail?.budget || '', Validators.required],
        brand: [data.campaignDetail?.brand || ''],
        productService: [data.campaignDetail?.productService || '', Validators.required],
        objectiveId: [data.campaignDetail?.objectiveId || null, Validators.required],
        campaignProducts: this.fb.array([])
      }),

      // Step 5: Production Info
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

    // Auto-fill for new requests
    if (!this.isEditMode && !this.isAssignedUser) {
      const currentUser = this.authService.currentUser();
      if (currentUser) {
        // Set Contact Person (Read-only)
        this.form.patchValue({ contactPerson: currentUser.name });
        this.form.get('contactPerson')?.disable();

        // Set Department (Team) - Auto-select user's team but allow changing
        const userTeams = (currentUser as any).teams as string[];
        if (userTeams && userTeams.length > 0) {
          const teamName = userTeams[0];
          this.form.patchValue({ department: teamName });
        }
      }
    }

    this.teams$.subscribe(teams => {
      // Teams loaded
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

          // Convert dates
          if (fullData.deliveryDate) fullData.deliveryDate = new Date(fullData.deliveryDate);
          if (fullData.productionInfo?.campaignEmissionDate) {
            fullData.productionInfo.campaignEmissionDate = new Date(fullData.productionInfo.campaignEmissionDate);
          }

          this.form.patchValue(fullData);

          // Disable read-only fields (AC5)
          // Department should be editable for reassignment
          // this.form.get('department')?.disable();
          this.form.get('contactPerson')?.disable();

          this.checkPermissions(fullData);

          // Handle FormArray for campaignProducts
          this.campaignProducts.clear();
          if (fullData.campaignDetail?.campaignProducts && fullData.campaignDetail.campaignProducts.length > 0) {
            fullData.campaignDetail.campaignProducts.forEach((cp: any) => this.addCampaignProduct(cp));
          } else {
            this.addCampaignProduct();
          }

          if (fullData.files) {
            if (this.existingFiles.length === 0) {
              // Wrap in setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
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
    this.workflowStages = WORKFLOW_STAGES;
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
    // No specific value changes logic needed for now
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

  next() {
    let isValid = false;

    if (!this.canEditCore && this.isAssignedUser) {
      switch (this.currentStep) {
        case 0:
          const statusControl = this.form.get('statusId');
          isValid = statusControl?.valid ?? true;
          if (!isValid) statusControl?.markAsDirty();
          break;
        case 1:
        case 2:
        case 3:
          isValid = true;
          break;
        case 4:
          const prodInfo = this.form.get('productionInfo') as FormGroup;
          isValid = prodInfo.valid;
          if (!isValid) prodInfo.markAllAsTouched();
          break;
      }
    } else {
      switch (this.currentStep) {
        case 0:
          const mainControls = ['name', 'department', 'deliveryDate'];
          isValid = mainControls.every(key => {
            const control = this.form.get(key);
            return control?.valid || control?.disabled;
          });
          if (!isValid) {
            mainControls.forEach(key => this.form.get(key)?.markAsDirty());
          }
          break;
        case 1:
          const customerGroup = this.form.get('customerData') as FormGroup;
          isValid = customerGroup.valid;
          if (!isValid) customerGroup.markAllAsTouched();
          break;
        case 2:
          const campaignGroup = this.form.get('campaignDetail') as FormGroup;
          isValid = campaignGroup.valid;
          if (!isValid) campaignGroup.markAllAsTouched();
          break;
        case 3:
          const audienceGroup = this.form.get('audienceData') as FormGroup;
          isValid = audienceGroup.valid;
          if (!isValid) audienceGroup.markAllAsTouched();
          break;
        case 4:
          const prodInfo = this.form.get('productionInfo') as FormGroup;
          isValid = prodInfo.valid;
          if (!isValid) prodInfo.markAllAsTouched();
          break;
      }
    }

    if (isValid) {
      this.saveData(false);
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
    } else {
      this.canEditCore = false;
      this.form.disable();
    }
    this.cd.detectChanges();
  }

  applyRestrictedMode() {
    this.form.disable();
    this.form.get('observations')?.enable();
    this.form.get('status')?.enable();
    this.form.get('department')?.enable(); // Allow reassignment
    this.form.get('assignedUserId')?.enable();

    const productionInfo = this.form.get('productionInfo') as FormGroup;
    if (productionInfo) {
      productionInfo.get('productionDetails')?.enable();
      productionInfo.get('additionalComments')?.enable();
    }
  }

  saveData(closeOnComplete: boolean = false) {
    if (this.isUploading$.value) {
      return;
    }

    let isValid = true;
    if (closeOnComplete) {
      if (!this.canEditCore && this.isAssignedUser) {
        const statusValid = this.form.get('status')?.valid ?? true;
        const prodInfo = this.form.get('productionInfo') as FormGroup;
        const prodDetailsValid = prodInfo?.get('productionDetails')?.valid ?? true;

        if (!statusValid || !prodDetailsValid) {
          isValid = false;
          if (!statusValid) this.form.get('status')?.markAsDirty();
          if (!prodDetailsValid) prodInfo?.get('productionDetails')?.markAsDirty();
        }
      } else {
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

    // Ensure status is set for new requests based on Budget logic
    if (!this.isEditMode) {
      // First creation (Step 0 -> 1)
      // User requirement: Status must be "quotation"
      const targetStageCode = 'quotation';

      forcedStage = targetStageCode;
      formValue.status = targetStageCode;
      console.log('Setting initial status to quotation');
    } else if (this.currentStep === 2) {
      // Saving Campaign Step (Step 2 -> 3)
      // User requirement: Update based on budget
      const budgetStr = formValue.campaignDetail?.budget || '0';
      const cleanBudget = String(budgetStr).replace(/[^0-9]/g, '');
      const budget = parseFloat(cleanBudget);

      let targetStageCode = 'in_sell';
      if (budget >= 50000000) {
        targetStageCode = 'get_data';
      }

      // Only apply if we are in an early stage (or if explicitly creating/updating early info)
      const currentStatus = this.loadedRequest?.status || formValue.status;
      const earlyStages = ['request', 'quotation', 'inicio', 'in_sell', 'get_data'];

      if (!currentStatus || earlyStages.includes(currentStatus)) {
        forcedStage = targetStageCode;
        formValue.status = targetStageCode;
        console.log(`Updating status to '${targetStageCode}' based on budget: ${budget}`);
      }
    } else if (!formValue.status) {
      // If edit mode but status missing, default to 'request'
      formValue.status = 'request';
    }

    const productionInfo = formValue.productionInfo ? { ...formValue.productionInfo } : undefined;
    if (productionInfo && productionInfo.campaignEmissionDate instanceof Date) {
      productionInfo.campaignEmissionDate = productionInfo.campaignEmissionDate.toISOString();
    }

    const fullPayload: Partial<ProductionRequest> = {
      ...this.loadedRequest,
      ...this.config.data,
      ...formValue,
      deliveryDate: formValue.deliveryDate ? formValue.deliveryDate.toISOString() : undefined,
      productionInfo: productionInfo
    };

    // Explicitly set stage if calculated locally, to ensure backend gets the intent
    // even if the statusId maps to 'request' (fallback) or if backend logic relies on stage string
    if (forcedStage) {
      fullPayload.stage = forcedStage;
    }

    if (fullPayload.campaignDetail?.campaignProducts) {
      // Filter out invalid products (missing productId)
      const validProducts = fullPayload.campaignDetail.campaignProducts.filter((p: any) => p.productId !== null && p.productId !== undefined);

      fullPayload.campaignDetail.campaignProducts = validProducts.map((p: any) => {
        const cleanP = { ...p };
        if (cleanP.id === null || cleanP.id === undefined) delete cleanP.id;
        return cleanP;
      });
    }

    const afterPersist = (saved: ProductionRequest | any) => {
      const actualData = saved.data || saved;
      console.log('Production request saved/updated:', saved);

      const requestId =
        actualData?.id ??
        actualData?.Id ??
        actualData?.requestId ??
        actualData?.RequestId ??
        this.config.data?.id;

      console.log('Extracted Request ID:', requestId);

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
          this.ref.close(result);
        } else {
          this.currentStep++;
          this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Progreso guardado correctamente' });
          this.cd.detectChanges();
        }
        return;
      }

      console.log('Files to upload:', this.selectedFiles);

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
              this.ref.close({ ...updated, files: mergedFiles });
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
              this.ref.close({ ...saved, files: mergedFiles });
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
        case 0: // General
          const generalData = {
            name: formValue.name,
            department: formValue.department,
            contactPerson: formValue.contactPerson,
            assignedUserId: formValue.assignedUserId,
            deliveryDate: formValue.deliveryDate ? formValue.deliveryDate.toISOString() : null,
            observations: formValue.observations,
            statusId: formValue.statusId
          };
          request$ = this.productionService.updateStepGeneral(requestId, generalData);
          break;
        case 1: // Customer
          request$ = this.productionService.updateStepCustomer(requestId, formValue.customerData);
          break;
        case 2: // Campaign
          const campaignDetail = { ...formValue.campaignDetail };
          if (campaignDetail.campaignProducts) {
            campaignDetail.campaignProducts = campaignDetail.campaignProducts.map((p: any) => {
              const cleanP = { ...p };
              if (cleanP.id === null || cleanP.id === undefined) delete cleanP.id;
              return cleanP;
            });
          }
          request$ = this.productionService.updateStepCampaign(requestId, campaignDetail, formValue.status);
          break;
        case 3: // Audience
          request$ = this.productionService.updateStepAudience(requestId, formValue.audienceData);
          break;
        case 4: // Production
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
}

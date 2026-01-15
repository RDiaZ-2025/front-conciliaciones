import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, BehaviorSubject } from 'rxjs';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { FileUploadModule } from 'primeng/fileupload';
import { ToastModule } from 'primeng/toast';
import { SelectModule } from 'primeng/select';
import { MenuItem, MessageService } from 'primeng/api';
import { StepsModule } from 'primeng/steps';
import { CheckboxModule } from 'primeng/checkbox';
import { ProductionRequest, UploadedFile, Team, CustomerData, AudienceData, CampaignDetail, ProductionInfo, Product, WORKFLOW_STAGES, Objective, Gender, AgeRange, SocioeconomicLevel, FormatType, RightsDuration } from '../../production.models';
import { AzureStorageService } from '../../../../services/azure-storage.service';
import { TeamService } from '../../../../services/team.service';
import { User } from '../../../../services/user.service';
import { ProductionService } from '../../../../services/production.service';
import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'app-production-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    FloatLabelModule,
    TextareaModule,
    DatePickerModule,
    FileUploadModule,
    ToastModule,
    SelectModule,
    StepsModule,
    CheckboxModule
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
  canEditCore = true;
  isAssignedUser = false;
  loadedRequest: ProductionRequest | null = null;

  uploadedFiles: any[] = [];
  selectedFiles: File[] = [];
  existingFiles: UploadedFile[] = [];
  isUploading$ = new BehaviorSubject<boolean>(false);
  minDate: Date = new Date();
  teams$ = new BehaviorSubject<Team[]>([]);
  requestingUsers$ = new BehaviorSubject<User[]>([]);
  assignedUsers$ = new BehaviorSubject<User[]>([]);
  products$ = new BehaviorSubject<Product[]>([]);
  workflowStages = WORKFLOW_STAGES;

  items: MenuItem[] = [];
  currentStep: number = 0;

  ngOnInit() {
    this.isEditMode = !!this.config.data?.id;
    const data = this.config.data || {};
    
    this.loadObjectives();
    this.loadAudienceOptions();
    this.loadProductionOptions();

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
      assignedTeam: [data.assignedTeam || '', Validators.required],
      assignedUserId: [data.assignedUserId || null, Validators.required],
      deliveryDate: [data.deliveryDate ? new Date(data.deliveryDate) : null, Validators.required],
      observations: [data.observations || ''],
      stage: [data.stage || 'request', Validators.required],

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
        campaignEmissionDate: [data.productionInfo?.campaignEmissionDate ? new Date(data.productionInfo.campaignEmissionDate) : null, Validators.required],
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
    this.teams$.subscribe(teams => {
      if (teams.length > 0 && !this.isEditMode && !this.isAssignedUser) {
        const currentUser = this.authService.currentUser();
        if (currentUser) {
          // Set Contact Person (Read-only)
          this.form.patchValue({ contactPerson: currentUser.name });
          this.form.get('contactPerson')?.disable();

          // Set Department (Read-only)
          const userTeams = (currentUser as any).teams as string[];
          if (userTeams && userTeams.length > 0) {
            const matchingTeam = teams.find(t => userTeams.includes(t.name));
            if (matchingTeam) {
              this.form.patchValue({ department: matchingTeam.name });
              this.form.get('department')?.disable();
              this.loadUsersForDepartment(matchingTeam.name);
            }
          }
        }
      }
    });

    this.loadProducts();

    if (this.isEditMode) {
      this.productionService.getProductionRequest(this.config.data.id).subscribe({
        next: (response: any) => {
          const fullData = response.data || response;
          this.loadedRequest = fullData;

          // Convert dates
          if (fullData.deliveryDate) fullData.deliveryDate = new Date(fullData.deliveryDate);
          if (fullData.productionInfo?.campaignEmissionDate) {
            fullData.productionInfo.campaignEmissionDate = new Date(fullData.productionInfo.campaignEmissionDate);
          }

          this.form.patchValue(fullData);

          // Disable read-only fields (AC5)
          this.form.get('department')?.disable();
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
            // Merge with storage files if they exist, or just use what's in the DB if you prefer.
            // But since the user requested "load from storage", let's prioritize the storage call we made in ngOnInit
            // or merge them. For now, let's trust the storage call above.
            // If DB has metadata we might want to use it, but the storage is the source of truth for "what exists".
            if (this.existingFiles.length === 0) {
              this.existingFiles = fullData.files;
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

  loadFilesFromStorage(requestId: number) {
    const folderPath = AzureStorageService.generateProductionRequestFolderPath(requestId.toString());
    this.azureService.listFiles(folderPath, 'private').then(blobs => {
      this.existingFiles = blobs.map(blobName => {
        const fileName = blobName.split('/').pop() || blobName;
        // Basic mapping since listFiles returns strings
        return {
          id: blobName,
          name: fileName,
          size: 0, // Size not available from simple list
          type: 'application/octet-stream', // Type unknown without metadata
          uploadDate: new Date().toISOString()
        };
      });
      // Optionally fetch full details if needed
      // this.azureService.getFilesDetails(folderPath, 'private').then(files => this.existingFiles = files);
    }).catch(err => {
      console.error('Error loading files from storage:', err);
    });
  }

  setupValueChanges() {
    this.form.get('department')?.valueChanges.subscribe(deptName => {
      this.loadUsersForDepartment(deptName);
    });

    this.form.get('assignedTeam')?.valueChanges.subscribe(teamName => {
      this.loadUsersForAssignedTeam(teamName);
    });
  }

  loadTeams() {
    this.teamService.getTeams().subscribe({
      next: (response) => {
        if (response.success) {
          this.teams$.next(response.data);

          // Initial load of users if data exists
          const dept = this.form.get('department')?.value;
          if (dept) this.loadUsersForDepartment(dept);

          const team = this.form.get('assignedTeam')?.value;
          if (team) this.loadUsersForAssignedTeam(team);
        }
      },
      error: (error) => {
        console.error('Error loading teams', error);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los equipos' });
      }
    });
  }

  loadUsersForDepartment(deptName: string) {
    const team = this.teams$.value.find(t => t.name === deptName);
    if (team) {
      this.teamService.getUsersByTeam(team.id).subscribe({
        next: (response) => {
          if (response.success) {
            this.requestingUsers$.next(response.data);
          }
        }
      });
    } else {
      this.requestingUsers$.next([]);
    }
  }

  loadUsersForAssignedTeam(teamName: string) {
    const team = this.teams$.value.find(t => t.name === teamName);
    if (team) {
      this.teamService.getUsersByTeam(team.id).subscribe({
        next: (response) => {
          if (response.success) {
            this.assignedUsers$.next(response.data);
          }
        }
      });
    } else {
      this.assignedUsers$.next([]);
    }
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

    // If restricted mode (Assigned User), we assume core fields are valid (or we can't change them anyway)
    // We only need to validate what we can edit.
    if (!this.canEditCore && this.isAssignedUser) {
      switch (this.currentStep) {
        case 0:
          // Validate stage (required)
          const stageControl = this.form.get('stage');
          isValid = stageControl?.valid ?? true;
          if (!isValid) stageControl?.markAsDirty();
          break;
        case 1: // Customer Data - fully disabled
        case 2: // Campaign Detail - fully disabled
        case 3: // Audience Data - fully disabled
          isValid = true;
          break;
        case 4: // Production Info - partially enabled
          const prodInfo = this.form.get('productionInfo') as FormGroup;
          isValid = prodInfo.valid;
          if (!isValid) prodInfo.markAllAsTouched();
          break;
      }
    } else {
      // Normal validation for full edit mode
      switch (this.currentStep) {
        case 0:
          // Validate main form fields (excluding nested groups)
          const mainControls = ['name', 'department', 'contactPerson', 'assignedTeam', 'assignedUserId', 'deliveryDate', 'stage'];
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
      }
    }

    if (isValid) {
      this.currentStep++;
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
    const user = this.authService.currentUser();
    if (!user) return;

    // Check permissions based on user role and assignment
    // Assuming permissions array contains strings like 'admin', 'supervisor'
    const isAdmin = user.permissions?.some(p => p.toLowerCase() === 'admin');
    const isSupervisor = user.permissions?.some(p => p.toLowerCase() === 'supervisor');

    // Check if current user is the assigned user
    // We compare IDs as strings to be safe
    this.isAssignedUser = String(user.id) === String(data.assignedUserId);

    if (isAdmin || isSupervisor) {
      this.canEditCore = true;
      this.form.enable();
    } else if (this.isAssignedUser) {
      this.canEditCore = false;
      this.applyRestrictedMode();
    } else {
      // Viewer or other role - readonly
      this.canEditCore = false;
      this.form.disable();
    }
    this.cd.detectChanges();
  }

  applyRestrictedMode() {
    // Disable all controls first
    this.form.disable();

    // Enable specific controls for Assigned User
    // Allowed: Comments/Observations, Files (handled separately), Status (Stage), Progress updates
    this.form.get('observations')?.enable();
    this.form.get('stage')?.enable(); // Ensure 'stage' control exists or is added to form

    // Enable reassignment fields
    this.form.get('assignedTeam')?.enable();
    this.form.get('assignedUserId')?.enable();

    // If there are nested form groups for specific editable sections, enable them here
    // For example, if 'productionInfo' has fields that assigned user can edit:
    const productionInfo = this.form.get('productionInfo') as FormGroup;
    if (productionInfo) {
      productionInfo.get('productionDetails')?.enable();
      productionInfo.get('additionalComments')?.enable();
    }
  }

  save() {
    if (this.isUploading$.value) {
      return;
    }

    let isValid = true;
    if (!this.canEditCore && this.isAssignedUser) {
      // Restricted mode validation: only check fields enabled for assigned user
      const stageValid = this.form.get('stage')?.valid ?? true;
      const prodInfo = this.form.get('productionInfo') as FormGroup;
      const prodDetailsValid = prodInfo?.get('productionDetails')?.valid ?? true;

      if (!stageValid || !prodDetailsValid) {
        isValid = false;
        if (!stageValid) this.form.get('stage')?.markAsDirty();
        if (!prodDetailsValid) prodInfo?.get('productionDetails')?.markAsDirty();
      }
    } else {
      isValid = this.form.valid;
    }

    if (!isValid) {
      this.form.markAllAsTouched();
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Por favor complete todos los campos requeridos en todos los pasos' });
      return;
    }

    this.isUploading$.next(true);
    const formValue = this.form.getRawValue();

    // Ensure nested dates are converted to strings if needed
    const productionInfo = formValue.productionInfo ? { ...formValue.productionInfo } : undefined;
    if (productionInfo && productionInfo.campaignEmissionDate instanceof Date) {
      productionInfo.campaignEmissionDate = productionInfo.campaignEmissionDate.toISOString();
    }

    const payload: Partial<ProductionRequest> = {
      ...this.loadedRequest, // Preserve original fields (requestDate, etc.)
      ...this.config.data,   // Merge passed config (mainly ID)
      ...formValue,          // Overwrite with form values
      deliveryDate: formValue.deliveryDate ? formValue.deliveryDate.toISOString() : undefined,
      productionInfo: productionInfo
    };

    // Clean up campaign products IDs (remove null IDs)
    if (payload.campaignDetail?.campaignProducts) {
      payload.campaignDetail.campaignProducts = payload.campaignDetail.campaignProducts.map((p: any) => {
        const cleanP = { ...p };
        if (cleanP.id === null || cleanP.id === undefined) delete cleanP.id;
        return cleanP;
      });
    }

    const afterPersist = (saved: ProductionRequest | any) => {
      // Handle potential response wrapper { success: true, data: { ... } }
      const actualData = saved.data || saved;

      // Log for debugging
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

      const folderPath = AzureStorageService.generateProductionRequestFolderPath(requestId);

      if (this.selectedFiles.length === 0) {
        this.isUploading$.next(false);
        const result: Partial<ProductionRequest> = {
          ...saved,
          files: [...this.existingFiles]
        };
        this.ref.close(result);
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
        this.productionService.updateProductionRequest(requestId, { files: mergedFiles }).subscribe({
          next: (updated) => {
            this.isUploading$.next(false);
            this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Solicitud guardada y archivos cargados' });
            this.ref.close({ ...updated, files: mergedFiles });
          },
          error: () => {
            this.isUploading$.next(false);
            this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'Archivos cargados, pero no se pudieron vincular en la solicitud' });
            this.ref.close({ ...saved, files: mergedFiles });
          }
        });
      }).catch((err) => {
        console.error('Upload error:', err);
        this.isUploading$.next(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los archivos' });
      });
    };

    if (this.isEditMode && this.config.data?.id) {
      this.productionService.updateProductionRequest(this.config.data.id, payload).subscribe({
        next: (saved) => afterPersist(saved),
        error: () => {
          this.isUploading$.next(false);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar la solicitud' });
        }
      });
    } else {
      this.productionService.createProductionRequest(payload).subscribe({
        next: (saved) => afterPersist(saved),
        error: () => {
          this.isUploading$.next(false);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear la solicitud' });
        }
      });
    }
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

import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { ProductionRequest, UploadedFile, Team, CustomerData, AudienceData, CampaignDetail, ProductionInfo, Product } from '../../production.models';
import { AzureStorageService } from '../../../../services/azure-storage.service';
import { TeamService } from '../../../../services/team.service';
import { User } from '../../../../services/user.service';
import { ProductionService } from '../../../../services/production.service';

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
  teamService = inject(TeamService);
  productionService = inject(ProductionService);
  cd = inject(ChangeDetectorRef);

  form!: FormGroup;
  isEditMode = false;
  uploadedFiles: any[] = [];
  selectedFiles: File[] = [];
  existingFiles: UploadedFile[] = [];
  isUploading = false;
  minDate: Date = new Date();
  teams: Team[] = [];
  requestingUsers: User[] = [];
  assignedUsers: User[] = [];
  products: Product[] = [];

  items: MenuItem[] = [];
  currentStep: number = 0;

  ngOnInit() {
    this.isEditMode = !!this.config.data?.id;
    const data = this.config.data || {};

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
        gender: [data.audienceData?.gender || '', Validators.required],
        geo: [data.audienceData?.geo || '', Validators.required],
        ageRange: [data.audienceData?.ageRange || '', Validators.required],
        socioEconomicLevel: [data.audienceData?.socioEconomicLevel || '', Validators.required],
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
        objective: [data.campaignDetail?.objective || '', Validators.required],
        campaignProducts: this.fb.array([])
      }),

      // Step 5: Production & Formats
      productionInfo: this.fb.group({
        formatType: [data.productionInfo?.formatType || '', Validators.required],
        rightsTime: [data.productionInfo?.rightsTime || '', Validators.required],
        campaignEmissionDate: [data.productionInfo?.campaignEmissionDate ? new Date(data.productionInfo.campaignEmissionDate) : null],
        communicationTone: [data.productionInfo?.communicationTone || '', Validators.required],
        ownAndExternalMedia: [data.productionInfo?.ownAndExternalMedia || ''],
        tvFormats: [data.productionInfo?.tvFormats || '', Validators.required],
        digitalFormats: [data.productionInfo?.digitalFormats || '', Validators.required],
        productionDetails: [data.productionInfo?.productionDetails || '', Validators.required],
        additionalComments: [data.productionInfo?.additionalComments || '']
      })
    });

    this.loadTeams();
    this.loadProducts();

    if (this.isEditMode) {
      this.productionService.getProductionRequestById(this.config.data.id).subscribe({
        next: (response: any) => {
          const fullData = response.data || response;

          // Convert dates
          if (fullData.deliveryDate) fullData.deliveryDate = new Date(fullData.deliveryDate);
          if (fullData.productionInfo?.campaignEmissionDate) {
            fullData.productionInfo.campaignEmissionDate = new Date(fullData.productionInfo.campaignEmissionDate);
          }

          this.form.patchValue(fullData);

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

      if (this.isEditMode && data.files) {
        this.existingFiles = data.files;
      }
    }

    this.setupValueChanges();
  }

  get campaignProducts() {
    return (this.form.get('campaignDetail') as FormGroup).get('campaignProducts') as FormArray;
  }

  addCampaignProduct(data?: any) {
    const productGroup = this.fb.group({
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
        this.products = products;
        this.cd.detectChanges();
      },
      error: (error) => {
        console.error('Error loading products', error);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los productos' });
      }
    });
  }

  loadFilesFromStorage(requestId: string) {
    const folderPath = AzureStorageService.generateProductionRequestFolderPath(requestId);
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
          this.teams = response.data;
          this.cd.detectChanges();

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
    const team = this.teams.find(t => t.name === deptName);
    if (team) {
      this.teamService.getUsersByTeam(team.id).subscribe({
        next: (response) => {
          if (response.success) {
            this.requestingUsers = response.data;
            this.cd.detectChanges();
          }
        }
      });
    } else {
      this.requestingUsers = [];
      this.cd.detectChanges();
    }
  }

  loadUsersForAssignedTeam(teamName: string) {
    const team = this.teams.find(t => t.name === teamName);
    if (team) {
      this.teamService.getUsersByTeam(team.id).subscribe({
        next: (response) => {
          if (response.success) {
            this.assignedUsers = response.data;
            this.cd.detectChanges();
          }
        }
      });
    } else {
      this.assignedUsers = [];
      this.cd.detectChanges();
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
    switch (this.currentStep) {
      case 0:
        // Validate main form fields (excluding nested groups)
        const mainControls = ['name', 'department', 'contactPerson', 'assignedTeam', 'assignedUserId', 'deliveryDate'];
        isValid = mainControls.every(key => this.form.get(key)?.valid);
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

  save() {
    if (this.isUploading) {
      return;
    }

    if (!this.form.valid) {
      this.form.markAllAsTouched();
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Por favor complete todos los campos requeridos en todos los pasos' });
      return;
    }

    this.isUploading = true;
    const formValue = this.form.value;
    const payload: Partial<ProductionRequest> = {
      ...this.config.data,
      ...formValue,
      deliveryDate: formValue.deliveryDate ? formValue.deliveryDate.toISOString() : undefined
    };

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
        this.isUploading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo obtener el ID de la solicitud para subir los archivos' });
        return;
      }

      const folderPath = AzureStorageService.generateProductionRequestFolderPath(requestId);

      if (this.selectedFiles.length === 0) {
        this.isUploading = false;
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
            this.isUploading = false;
            this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Solicitud guardada y archivos cargados' });
            this.ref.close({ ...updated, files: mergedFiles });
          },
          error: () => {
            this.isUploading = false;
            this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'Archivos cargados, pero no se pudieron vincular en la solicitud' });
            this.ref.close({ ...saved, files: mergedFiles });
          }
        });
      }).catch((err) => {
        console.error('Upload error:', err);
        this.isUploading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los archivos' });
      });
    };

    if (this.isEditMode && this.config.data?.id) {
      this.productionService.updateProductionRequest(this.config.data.id, payload).subscribe({
        next: (saved) => afterPersist(saved),
        error: () => {
          this.isUploading = false;
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar la solicitud' });
        }
      });
    } else {
      this.productionService.createProductionRequest(payload).subscribe({
        next: (saved) => afterPersist(saved),
        error: () => {
          this.isUploading = false;
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

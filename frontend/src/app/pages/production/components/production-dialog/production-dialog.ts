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
        next: (fullData: any) => {
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
            this.existingFiles = fullData.files;
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

  async onUpload(event: any) {
    this.isUploading = true;
    const files = event.files;
    const requestId = this.config.data?.id || Date.now().toString(); // Use temp ID if new

    try {
      const folderPath = AzureStorageService.generateProductionFolderPath(requestId);
      const results = await this.azureService.uploadFiles(files, {
        folderPath,
        metadata: {
          requestId,
          uploadType: 'production'
        }
      });

      const newFiles: UploadedFile[] = results.map((result, index) => ({
        id: `${folderPath}/${result.fileName}`,
        name: result.fileName,
        size: files[index].size,
        type: files[index].type,
        url: result.url,
        uploadDate: new Date().toISOString()
      }));

      this.uploadedFiles = [...this.uploadedFiles, ...newFiles];
      this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Files uploaded successfully' });
    } catch (error) {
      console.error('Upload error', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'File upload failed' });
    } finally {
      this.isUploading = false;
    }
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
    if (this.form.valid) {
      const formValue = this.form.value;
      const result: Partial<ProductionRequest> = {
        ...this.config.data,
        ...formValue,
        deliveryDate: formValue.deliveryDate ? formValue.deliveryDate.toISOString() : undefined,
        files: [...this.existingFiles, ...this.uploadedFiles]
      };
      this.ref.close(result);
    } else {
      this.form.markAllAsTouched();
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Por favor complete todos los campos requeridos en todos los pasos' });
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

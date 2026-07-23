import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';

import { LucideIconComponent } from '../../components/lucide-icon/lucide-icon.component';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { CustomerService, Customer } from '../../services/customer.service';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    CardModule,
    ToastModule,
    ConfirmDialogModule,
    DialogModule,
    SelectModule,
    CheckboxModule,
    TooltipModule,
    LucideIconComponent,
    PageHeaderComponent
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './customers.component.html',
  styleUrls: ['./customers.component.css']
})
export class CustomersComponent implements OnInit {
  private customerService = inject(CustomerService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  // States
  customers = signal<Customer[]>([]);
  totalRecords = signal<number>(0);
  loading = signal<boolean>(false);
  searchQuery = signal<string>('');
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  // Modal Dialogs
  showEditDialog = signal<boolean>(false);
  showBulkUploadDialog = signal<boolean>(false);
  isEditMode = signal<boolean>(false);

  // Form Model
  currentCustomer = signal<Partial<Customer>>({
    id: undefined,
    documentType: 'NIT',
    documentNumber: '',
    businessName: '',
    email: '',
    phoneNumber: ''
  });

  // Bulk Upload Model
  selectedFile: File | null = null;
  uploading = signal<boolean>(false);
  uploadResults = signal<any | null>(null);

  // Options
  documentTypes = [
    { label: 'NIT - Número Identificación Tributaria', value: 'NIT' },
    { label: 'CC - Cédula de Ciudadanía', value: 'CC' },
    { label: 'CE - Cédula de Extranjería', value: 'CE' },
    { label: 'RUT - Registro Único Tributario', value: 'RUT' },
    { label: 'PP - Pasaporte', value: 'PP' }
  ];

  @ViewChild('dt') dt!: Table;

  ngOnInit() {
    this.loadCustomers();
  }

  loadCustomers() {
    this.loading.set(true);
    this.customerService.getCustomers({
      search: this.searchQuery(),
      page: this.currentPage(),
      limit: this.pageSize()
    }).subscribe({
      next: (res) => {
        this.customers.set(res.data);
        this.totalRecords.set(res.total);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading customers:', err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los clientes' });
        this.loading.set(false);
      }
    });
  }

  onLazyLoad(event: any) {
    const page = Math.floor(event.first / event.rows) + 1;
    const limit = event.rows;
    this.currentPage.set(page);
    this.pageSize.set(limit);
    this.loadCustomers();
  }

  onSearch() {
    this.currentPage.set(1);
    if (this.dt) {
      this.dt.first = 0;
    }
    this.loadCustomers();
  }

  openNew() {
    this.isEditMode.set(false);
    this.currentCustomer.set({
      id: undefined,
      documentType: 'NIT',
      documentNumber: '',
      businessName: '',
      email: '',
      phoneNumber: ''
    });
    this.showEditDialog.set(true);
  }

  openEdit(customer: Customer) {
    this.isEditMode.set(true);
    this.currentCustomer.set({ ...customer });
    this.showEditDialog.set(true);
  }

  saveCustomer() {
    const customer = this.currentCustomer();
    
    // Validations
    if (!customer.documentType || !customer.documentNumber?.trim()) {
      this.messageService.add({ severity: 'error', summary: 'Validación', detail: 'El tipo y número de documento son obligatorios' });
      return;
    }
    if (!customer.email?.trim()) {
      this.messageService.add({ severity: 'error', summary: 'Validación', detail: 'El correo electrónico es obligatorio' });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customer.email.trim())) {
      this.messageService.add({ severity: 'error', summary: 'Validación', detail: 'Formato de correo electrónico inválido' });
      return;
    }

    this.loading.set(true);
    if (this.isEditMode()) {
      this.customerService.updateCustomer(customer.id!, customer).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Cliente actualizado correctamente' });
          this.showEditDialog.set(false);
          this.loadCustomers();
        },
        error: (err: any) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Error al actualizar el cliente' });
          this.loading.set(false);
        }
      });
    } else {
      this.customerService.createCustomer(customer).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Cliente creado correctamente' });
          this.showEditDialog.set(false);
          this.loadCustomers();
        },
        error: (err: any) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Error al crear el cliente' });
          this.loading.set(false);
        }
      });
    }
  }

  deleteCustomer(customer: Customer) {
    this.confirmationService.confirm({
      message: `¿Estás seguro de que deseas de baja al cliente "${customer.businessName || customer.documentNumber}"?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loading.set(true);
        this.customerService.deleteCustomer(customer.id!).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Cliente eliminado correctamente' });
            this.loadCustomers();
          },
          error: (err) => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el cliente' });
            this.loading.set(false);
          }
        });
      }
    });
  }

  // --- Bulk Import ---
  openBulkUpload() {
    this.selectedFile = null;
    this.uploadResults.set(null);
    this.showBulkUploadDialog.set(true);
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  downloadTemplate() {
    const csvContent = 'data:text/csv;charset=utf-8,TipoDeDocumento,NumeroDeDocumento,RazonSocial,CorreoElectronico,NumeroCelular\nNIT,123456789-0,Claro Media SAS,contacto@claromedia.com,3001234567\nCC,987654321,Juan Perez,,juan.perez@email.com,3109876543\n';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'plantilla_clientes.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  processBulkUpload() {
    if (!this.selectedFile) {
      this.messageService.add({ severity: 'error', summary: 'Archivo requerido', detail: 'Por favor, selecciona un archivo Excel o CSV' });
      return;
    }

    this.uploading.set(true);
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const arrayBuffer = e.target.result;
      const base64String = btoa(
        new Uint8Array(arrayBuffer)
          .reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      this.customerService.bulkUpload(this.selectedFile!.name, base64String).subscribe({
        next: (res) => {
          this.uploadResults.set(res.data);
          this.uploading.set(false);
          this.loadCustomers();
          this.messageService.add({ severity: 'success', summary: 'Carga Completada', detail: 'Se procesó la carga masiva' });
        },
        error: (err) => {
          console.error(err);
          if (err.error?.data?.validationFailed) {
            this.uploadResults.set(err.error.data);
            this.messageService.add({ severity: 'error', summary: 'Errores de Validación', detail: 'El archivo contiene errores. Ningún dato fue importado.' });
          } else {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Error al procesar el archivo' });
          }
          this.uploading.set(false);
        }
      });
    };
    reader.readAsArrayBuffer(this.selectedFile);
  }
}

import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomerService, Customer } from '../../services/customer.service';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { LucideIconComponent } from '../lucide-icon/lucide-icon.component';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-customer-autocomplete',
  standalone: true,
  imports: [CommonModule, FormsModule, InputTextModule, ButtonModule, LucideIconComponent, DialogModule, SelectModule],
  templateUrl: './customer-autocomplete.component.html',
  styleUrls: ['./customer-autocomplete.component.css']
})
export class CustomerAutocompleteComponent implements OnInit, OnChanges {
  @Input() value: string = ''; // JSON string of selected customer
  @Input() disabled: boolean = false;
  @Input() placeholder: string = '';
  @Output() valueChange = new EventEmitter<string>();

  searchQuery: string = '';
  suggestions: Customer[] = [];
  loading: boolean = false;
  showDropdown: boolean = false;
  hasSearched: boolean = false;
  selectedCustomer: Customer | null = null;
  private debounceTimer: any = null;

  // Modal properties for customer registration
  displayCreateModal: boolean = false;
  newCustomer: Partial<Customer> = {
    documentType: 'NIT',
    documentNumber: '',
    businessName: '',
    email: '',
    phoneNumber: ''
  };
  docTypes = [
    { label: 'NIT', value: 'NIT' },
    { label: 'Cédula de Ciudadanía (CC)', value: 'CC' },
    { label: 'Cédula de Extranjería (CE)', value: 'CE' },
    { label: 'Pasaporte (PP)', value: 'PP' },
    { label: 'Otro', value: 'OT' }
  ];
  saveLoading: boolean = false;
  errorMessage: string = '';

  constructor(private customerService: CustomerService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.parseValue();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['value'] && !changes['value'].firstChange) {
      this.parseValue();
    }
  }

  private parseValue() {
    if (this.value) {
      try {
        const cust = JSON.parse(this.value);
        if (cust && cust.documentNumber) {
          this.selectedCustomer = cust;
          this.searchQuery = cust.businessName || `${cust.documentType} ${cust.documentNumber}`;
          this.cdr.detectChanges();
          return;
        }
      } catch (e) {
        // Fallback
      }
    }
    this.selectedCustomer = null;
    this.searchQuery = '';
    this.cdr.detectChanges();
  }

  onInputChange() {
    if (!this.searchQuery) {
      this.clearSelection();
      return;
    }

    if (this.searchQuery.length < 3) {
      this.suggestions = [];
      this.loading = false;
      this.hasSearched = false;
      this.cdr.detectChanges();
      return;
    }

    this.showDropdown = true;
    this.hasSearched = false; // Reset search state when typing continues
    this.cdr.detectChanges();

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // 1.5 seconds debounce as requested
    this.debounceTimer = setTimeout(() => {
      this.search();
    }, 1500);
  }

  private search() {
    this.loading = true;
    this.cdr.detectChanges();

    this.customerService.getCustomers({ search: this.searchQuery, limit: 5 }).subscribe({
      next: (res) => {
        this.suggestions = res.data;
        this.loading = false;
        this.hasSearched = true; // Mark as searched only after response arrives!
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.hasSearched = true;
        this.cdr.detectChanges();
      }
    });
  }

  selectCustomer(cust: Customer) {
    this.selectedCustomer = cust;
    this.searchQuery = cust.businessName || `${cust.documentType} ${cust.documentNumber}`;
    this.showDropdown = false;
    this.hasSearched = false;
    this.valueChange.emit(JSON.stringify(cust));
    this.cdr.detectChanges();
  }

  clearSelection() {
    this.selectedCustomer = null;
    this.searchQuery = '';
    this.suggestions = [];
    this.showDropdown = false;
    this.hasSearched = false;
    this.valueChange.emit('');
    this.cdr.detectChanges();
  }

  openCreateModal(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    
    this.showDropdown = false;
    this.errorMessage = '';
    
    // Check if searchQuery is mostly digits to pre-fill doc number, else pre-fill name
    const cleanSearch = this.searchQuery.trim();
    const isNumeric = /^\d+$/.test(cleanSearch);
    
    this.newCustomer = {
      documentType: 'NIT',
      documentNumber: isNumeric ? cleanSearch : '',
      businessName: isNumeric ? '' : cleanSearch,
      email: '',
      phoneNumber: ''
    };
    
    this.displayCreateModal = true;
    this.cdr.detectChanges();
  }

  saveNewCustomer() {
    this.errorMessage = '';
    
    // Validate required fields
    if (!this.newCustomer.documentType) {
      this.errorMessage = 'El tipo de documento es obligatorio.';
      return;
    }
    if (!this.newCustomer.documentNumber || !this.newCustomer.documentNumber.trim()) {
      this.errorMessage = 'El número de documento es obligatorio.';
      return;
    }
    if (!this.newCustomer.businessName || !this.newCustomer.businessName.trim()) {
      this.errorMessage = 'La razón social o nombre es obligatorio.';
      return;
    }
    if (!this.newCustomer.email || !this.newCustomer.email.trim()) {
      this.errorMessage = 'El correo electrónico es obligatorio.';
      return;
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.newCustomer.email.trim())) {
      this.errorMessage = 'El formato del correo electrónico es inválido.';
      return;
    }
    
    // Check if phoneNumber contains only valid characters
    if (this.newCustomer.phoneNumber && this.newCustomer.phoneNumber.trim()) {
      const phoneClean = this.newCustomer.phoneNumber.trim();
      const phoneRegex = /^[0-9+\-\s()]+$/;
      if (!phoneRegex.test(phoneClean)) {
        this.errorMessage = 'El número celular solo puede contener números, espacios o símbolos (+, -, parentesis).';
        return;
      }
    }

    this.saveLoading = true;
    this.cdr.detectChanges();

    this.customerService.createCustomer(this.newCustomer).subscribe({
      next: (res) => {
        this.saveLoading = false;
        this.displayCreateModal = false;
        
        // Select the newly created customer immediately!
        if (res && res.data) {
          this.selectCustomer(res.data);
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.saveLoading = false;
        this.errorMessage = err.error?.message || 'Error al registrar el cliente en el servidor.';
        this.cdr.detectChanges();
      }
    });
  }

  onBlur() {
    setTimeout(() => {
      this.showDropdown = false;
      this.cdr.detectChanges();
    }, 250);
  }
}

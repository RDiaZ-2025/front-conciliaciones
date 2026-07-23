import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomerService, Customer } from '../../services/customer.service';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-customer-autocomplete',
  standalone: true,
  imports: [CommonModule, FormsModule, InputTextModule, ButtonModule],
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
  selectedCustomer: Customer | null = null;
  private debounceTimer: any = null;

  constructor(private customerService: CustomerService) {}

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
          return;
        }
      } catch (e) {
        // Fallback
      }
    }
    this.selectedCustomer = null;
    this.searchQuery = '';
  }

  onInputChange() {
    if (!this.searchQuery) {
      this.clearSelection();
      return;
    }

    if (this.searchQuery.length < 3) {
      this.suggestions = [];
      this.loading = false;
      return;
    }

    this.loading = true;
    this.showDropdown = true;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // 3 seconds debounce as requested
    this.debounceTimer = setTimeout(() => {
      this.search();
    }, 3000);
  }

  private search() {
    this.customerService.getCustomers({ search: this.searchQuery, limit: 5 }).subscribe({
      next: (res) => {
        this.suggestions = res.data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  selectCustomer(cust: Customer) {
    this.selectedCustomer = cust;
    this.searchQuery = cust.businessName || `${cust.documentType} ${cust.documentNumber}`;
    this.showDropdown = false;
    this.valueChange.emit(JSON.stringify(cust));
  }

  clearSelection() {
    this.selectedCustomer = null;
    this.searchQuery = '';
    this.suggestions = [];
    this.showDropdown = false;
    this.valueChange.emit('');
  }

  onBlur() {
    setTimeout(() => {
      this.showDropdown = false;
    }, 250);
  }
}

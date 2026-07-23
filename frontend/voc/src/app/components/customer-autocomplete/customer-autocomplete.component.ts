import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomerService, Customer } from '../../services/customer.service';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { LucideIconComponent } from '../lucide-icon/lucide-icon.component';

@Component({
  selector: 'app-customer-autocomplete',
  standalone: true,
  imports: [CommonModule, FormsModule, InputTextModule, ButtonModule, LucideIconComponent],
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

  onBlur() {
    setTimeout(() => {
      this.showDropdown = false;
      this.cdr.detectChanges();
    }, 250);
  }
}

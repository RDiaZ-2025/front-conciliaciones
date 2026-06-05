import { Component, EventEmitter, Input, Output, signal, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-multi-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative w-full">
      <button 
        type="button"
        (click)="toggle()"
        class="w-full bg-premium-card pl-4 pr-10 py-2.5 rounded-xl text-xs font-bold text-main border border-white/10 hover:border-primary/50 focus:outline/none focus:ring-4 focus:ring-primary/10 transition-all cursor-pointer shadow-lg truncate text-left"
        [class.border-primary]="isOpen"
      >
        <span *ngIf="selectedValues.length === 0" class="text-muted">{{ placeholder }}</span>
        <span *ngIf="selectedValues.length > 0 && selectedValues.length <= 2" class="truncate">
          {{ selectedValues.join(', ') }}
        </span>
        <span *ngIf="selectedValues.length > 2">
          {{ selectedValues.length }} {{ labelPlural || 'seleccionados' }}
        </span>
        
        <div class="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 pointer-events-none">
          <svg 
            class="w-3 h-3 transition-transform duration-200" 
            [class.rotate-180]="isOpen"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </div>
      </button>

      <div 
        *ngIf="isOpen"
        class="absolute z-[9999] mt-2 w-64 glass-effect rounded-2xl shadow-2xl border border-white/10 p-2 animate-fade-in-up origin-top-left flex flex-col"
      >
        <!-- Buscador -->
        <div class="p-1 mb-1 border-b border-white/10 shrink-0">
          <div class="relative">
            <input 
              type="text" 
              [(ngModel)]="searchQuery" 
              placeholder="Buscar..." 
              class="w-full bg-black/20 border border-white/10 rounded-lg py-1.5 pl-8 pr-3 text-xs text-main placeholder-muted focus:outline-none focus:border-primary/50 transition-colors"
              (click)="$event.stopPropagation()"
            >
            <svg class="w-3.5 h-3.5 text-muted absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
        </div>

        <!-- Opciones -->
        <div class="space-y-1 overflow-y-auto max-h-48 pr-1 custom-scrollbar">
          <label 
            *ngFor="let option of filteredOptions"
            class="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.05] cursor-pointer transition-colors group"
            [class.bg-primary/10]="isSelected(option)"
          >
            <div class="relative flex items-center">
              <input 
                type="checkbox"
                [checked]="isSelected(option)"
                (change)="toggleOption(option)"
                class="peer hidden"
              >
              <div class="w-5 h-5 rounded-md border-2 border-white/10 peer-checked:border-primary peer-checked:bg-primary transition-all flex items-center justify-center">
                <svg 
                  class="w-3 h-3 text-white scale-0 peer-checked:scale-100 transition-transform" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
            </div>
            <span class="text-xs font-bold text-muted group-hover:text-main transition-colors truncate">
              {{ option }}
            </span>
          </label>
          <div *ngIf="filteredOptions.length === 0" class="text-xs text-center text-muted py-3">
            No se encontraron resultados
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .glass-effect {
      background: rgba(15, 23, 42, 0.8);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }
    .custom-scrollbar::-webkit-scrollbar {
      width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  `]
})
export class MultiSelectComponent {
  @Input() options: string[] = [];
  @Input() selectedValues: string[] = [];
  @Input() placeholder: string = 'Seleccionar...';
  @Input() labelPlural: string = '';

  @Output() selectionChange = new EventEmitter<string[]>();
  @Output() selectedValuesChange = new EventEmitter<string[]>();

  isOpen = false;
  searchQuery = '';

  get filteredOptions(): string[] {
    let result = this.options;
    
    // Filtro por búsqueda
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(o => o.toLowerCase().includes(q));
    }

    // Ordenamiento: seleccionados de primero, preservando orden original
    return result.slice().sort((a, b) => {
      const aSelected = this.isSelected(a);
      const bSelected = this.isSelected(b);
      
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      
      return this.options.indexOf(a) - this.options.indexOf(b);
    });
  }

  constructor(private elementRef: ElementRef) { }

  toggle() {
    this.isOpen = !this.isOpen;
    if (!this.isOpen) this.searchQuery = '';
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
      this.searchQuery = '';
    }
  }

  isSelected(option: string): boolean {
    return this.selectedValues.includes(option);
  }

  toggleOption(option: string) {
    const index = this.selectedValues.indexOf(option);
    if (index === -1) {
      this.selectedValues = [...this.selectedValues, option];
    } else {
      this.selectedValues = this.selectedValues.filter(val => val !== option);
    }
    this.selectedValuesChange.emit(this.selectedValues);
    this.selectionChange.emit(this.selectedValues);
  }
}

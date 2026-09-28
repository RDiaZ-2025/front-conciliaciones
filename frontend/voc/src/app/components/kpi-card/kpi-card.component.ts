import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [ngClass]="containerClasses">
        <div [ngClass]="['text-xs font-bold uppercase tracking-wider mb-1', labelColorClass]">{{ label }}</div>
        <div [ngClass]="['text-2xl font-bold', valueColorClass]">{{ isNumber(value) ? (value | number) : value }}{{ unit }}</div>
        
        <div *ngIf="variation !== undefined" class="mt-2 flex items-center text-xs font-bold"
            [ngClass]="variation >= 0 ? 'text-emerald-500' : 'text-red-500'">
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    [attr.d]="variation >= 0 ? 'M5 10l7-7m0 0l7 7m-7-7v18' : 'M19 14l-7 7m0 0l-7-7m7 7V3'">
                </path>
            </svg>
            <span>{{ variation > 0 && variationType === 'pp' ? '+' : '' }}{{ variation | number:'1.1-1' }}{{ variationType === 'pp' ? ' pp' : '%' }}</span>
            <span class="text-muted ml-1 font-normal">{{ comparisonPeriod }}</span>
        </div>
        
        <div *ngIf="footerText" class="mt-2 text-xs font-medium text-red-400">
            {{ footerText }}
        </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class KpiCard {
  @Input() label: string = '';
  @Input() value: string | number = '';
  @Input() unit: string = '';
  @Input() variation?: number;
  @Input() variationType: 'pp' | 'percentage' = 'percentage';
  @Input() comparisonPeriod: string = '';
  @Input() footerText?: string;
  @Input() variant: 'default' | 'gradient' = 'default';
  @Input() color: 'red' | 'slate' | 'emerald' | 'pink' | 'amber' = 'slate';

  get containerClasses(): string[] {
    const base = 'p-4 rounded-2xl border transition-all duration-300 shadow-lg hover:shadow-xl';
    if (this.variant === 'gradient') {
      return [base, 'bg-gradient-to-br from-primary/20 to-white/5 border-primary/30'];
    }
    return [base, 'bg-premium-card border-main'];
  }

  get labelColorClass(): string {
    if (this.variant === 'gradient') return 'text-primary/80';
    return 'text-muted';
  }

  get valueColorClass(): string {
    return 'text-main';
  }

  isNumber(val: any): boolean {
    return typeof val === 'number';
  }
}


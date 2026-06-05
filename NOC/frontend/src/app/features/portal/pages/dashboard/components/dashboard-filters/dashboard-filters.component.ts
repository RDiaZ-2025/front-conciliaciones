import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardFilters } from '../../dashboard.service';
import { CalendarPickerComponent } from '../calendar-picker/calendar-picker.component';
import { MultiSelectComponent } from '../../../../../../shared/components/multi-select/multi-select.component';

export interface FilterVisibility {
  date: boolean;
  source: boolean;
  section: boolean;
  author: boolean;
  topic: boolean;
  category: boolean;
}

@Component({
  selector: 'app-dashboard-filters',
  standalone: true,
  imports: [CommonModule, FormsModule, CalendarPickerComponent, MultiSelectComponent],
  templateUrl: './dashboard-filters.component.html',
  styleUrls: ['./dashboard-filters.component.scss']
})
export class DashboardFiltersComponent {
  @Input() options: DashboardFilters = { authors: [], topics: [], categories: [], sections: [], sources: [] };
  @Input() filters: any = {
    start_date: '',
    end_date: '',
    source: '',
    section: '',
    author: '',
    topic: '',
    category: ''
  };

  @Input() visibleFilters: FilterVisibility = {
    date: true,
    source: true,
    section: true,
    author: true,
    topic: true,
    category: true
  };

  @Output() filterChange = new EventEmitter<any>();
  @Output() clear = new EventEmitter<void>();

  showStartCalendar = false;
  showEndCalendar = false;
  showPresets = false;

  onChange(value?: any) {
    this.filterChange.emit(this.filters);
  }

  onClear() {
    this.clear.emit();
  }

  toggleStartCalendar() {
    this.showStartCalendar = !this.showStartCalendar;
    this.showEndCalendar = false;
    this.showPresets = false;
  }

  toggleEndCalendar() {
    this.showEndCalendar = !this.showEndCalendar;
    this.showStartCalendar = false;
    this.showPresets = false;
  }

  togglePresets() {
    this.showPresets = !this.showPresets;
    this.showStartCalendar = false;
    this.showEndCalendar = false;
  }

  onStartDateSelected(date: string) {
    this.filters.start_date = date;
    this.showStartCalendar = false;
    this.onChange();
  }

  onEndDateSelected(date: string) {
    this.filters.end_date = date;
    this.showEndCalendar = false;
    this.onChange();
  }

  closeAllOverlays() {
    this.showStartCalendar = false;
    this.showEndCalendar = false;
    this.showPresets = false;
  }

  applyPreset(type: 'today' | '7d' | '30d' | 'month' | 'year') {
    const end = new Date();
    let start = new Date();

    switch (type) {
      case 'today':
        start = new Date();
        break;
      case '7d':
        start.setDate(end.getDate() - 7);
        break;
      case '30d':
        start.setDate(end.getDate() - 30);
        break;
      case 'month':
        start = new Date(end.getFullYear(), end.getMonth(), 1);
        break;
      case 'year':
        start = new Date(end.getFullYear(), 0, 1);
        break;
    }

    this.filters.start_date = start.toISOString().split('T')[0];
    this.filters.end_date = end.toISOString().split('T')[0];
    this.showPresets = false;
    this.onChange();
  }
}

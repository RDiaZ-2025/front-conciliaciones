import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-calendar-picker',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './calendar-picker.component.html',
    styleUrls: ['./calendar-picker.component.scss']
})
export class CalendarPickerComponent implements OnInit {
    @Input() initialDate: string = '';
    @Output() dateSelected = new EventEmitter<string>();

    currentDate: Date = new Date();
    viewDate: Date = new Date();
    daysInMonth: number[] = [];
    emptyCells: number[] = [];
    months: string[] = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    years: number[] = [];
    selectedDate: string = '';

    ngOnInit() {
        if (this.initialDate) {
            this.selectedDate = this.initialDate;
            this.viewDate = new Date(this.initialDate);
        }
        this.generateYears();
        this.generateCalendar();
    }

    generateYears() {
        this.years = []; // IMPORTANT: Clear array to prevent accumulation
        const currentYear = new Date().getFullYear();
        
        // Mejor UX: Rango más lógico (desde futuro cercano hasta hace 3 años)
        // Y ordenado descendentemente para que los años recientes aparezcan primero en el select
        for (let i = currentYear + 1; i >= currentYear - 3; i--) {
            this.years.push(i);
        }
    }

    generateCalendar() {
        const year = this.viewDate.getFullYear();
        const month = this.viewDate.getMonth();

        const firstDay = new Date(year, month, 1).getDay();
        const lastDate = new Date(year, month + 1, 0).getDate();

        // Adjust first day to start on Monday (optional, common in LatAm)
        // 0 is Sunday, 1 is Monday. To start on Monday: (firstDay + 6) % 7
        const adjustedFirstDay = (firstDay + 6) % 7;

        this.emptyCells = Array(adjustedFirstDay).fill(0);
        this.daysInMonth = Array.from({ length: lastDate }, (_, i) => i + 1);
    }

    changeMonth(delta: number) {
        this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + delta, 1);
        this.generateCalendar();
    }

    onYearChange(event: any) {
        const year = parseInt(event.target.value);
        this.viewDate = new Date(year, this.viewDate.getMonth(), 1);
        this.generateCalendar();
    }

    onMonthChange(event: any) {
        const month = parseInt(event.target.value);
        this.viewDate = new Date(this.viewDate.getFullYear(), month, 1);
        this.generateCalendar();
    }

    selectDay(day: number) {
        const year = this.viewDate.getFullYear();
        const month = (this.viewDate.getMonth() + 1).toString().padStart(2, '0');
        const d = day.toString().padStart(2, '0');

        this.selectedDate = `${year}-${month}-${d}`;
        this.dateSelected.emit(this.selectedDate);
    }

    isToday(day: number): boolean {
        const today = new Date();
        return today.getDate() === day &&
            today.getMonth() === this.viewDate.getMonth() &&
            today.getFullYear() === this.viewDate.getFullYear();
    }

    isSelected(day: number): boolean {
        if (!this.selectedDate) return false;
        const [y, m, d] = this.selectedDate.split('-').map(Number);
        return d === day &&
            m === this.viewDate.getMonth() + 1 &&
            y === this.viewDate.getFullYear();
    }
}

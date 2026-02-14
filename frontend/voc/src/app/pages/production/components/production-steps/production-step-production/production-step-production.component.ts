import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { FormatType, RightsDuration } from '../../../production.models';

@Component({
  selector: 'app-production-step-production',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    FloatLabelModule,
    SelectModule,
    TextareaModule,
    DatePickerModule
  ],
  templateUrl: './production-step-production.component.html'
})
export class ProductionStepProductionComponent {
  @Input() form!: FormGroup;
  @Input() formatTypes: FormatType[] = [];
  @Input() rightsDurations: RightsDuration[] = [];
}
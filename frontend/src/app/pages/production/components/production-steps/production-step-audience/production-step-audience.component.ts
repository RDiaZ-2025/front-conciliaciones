import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { Gender, AgeRange, SocioeconomicLevel } from '../../../production.models';

@Component({
  selector: 'app-production-step-audience',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    FloatLabelModule,
    SelectModule,
    TextareaModule
  ],
  templateUrl: './production-step-audience.component.html'
})
export class ProductionStepAudienceComponent {
  @Input() form!: FormGroup;
  @Input() genders: Gender[] = [];
  @Input() ageRanges: AgeRange[] = [];
  @Input() socioeconomicLevels: SocioeconomicLevel[] = [];
}
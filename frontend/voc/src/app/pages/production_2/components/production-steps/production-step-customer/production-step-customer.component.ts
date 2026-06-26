import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';
import { SelectModule } from 'primeng/select';
import { InputMaskModule } from 'primeng/inputmask';

@Component({
  selector: 'app-production-step-customer',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    FloatLabelModule,
    SelectModule,
    InputMaskModule
  ],
  templateUrl: './production-step-customer.component.html'
})
export class ProductionStepCustomerComponent {
  @Input() form!: FormGroup;

  clientTypes = [
    { label: 'Cliente', value: 'cliente' },
    { label: 'Agencia', value: 'agencia' }
  ];
}
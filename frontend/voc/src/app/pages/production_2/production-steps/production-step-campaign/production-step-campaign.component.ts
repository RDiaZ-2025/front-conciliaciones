import { LucideIconComponent } from '../../../../components/lucide-icon/lucide-icon.component';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule, FormArray } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { Objective } from '../../../../models/common/objective';
import { Product } from '../../../../models/common/product';

@Component({
  selector: 'app-production-step-campaign',
  standalone: true,
  imports: [
    LucideIconComponent,
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    FloatLabelModule,
    SelectModule,
    ButtonModule,
    InputNumberModule
  ],
  templateUrl: './production-step-campaign.component.html'
})
export class ProductionStepCampaignComponent {
  @Input() form!: FormGroup;
  @Input() campaignObjectives: Objective[] = [];
  @Input() products: Product[] = [];
  @Output() addProduct = new EventEmitter<void>();
  @Output() removeProduct = new EventEmitter<number>();

  get campaignProducts() {
    return (this.form.get('campaignDetail') as FormGroup).get('campaignProducts') as FormArray;
  }

  onAddProduct() {
    this.addProduct.emit();
  }

  onRemoveProduct(index: number) {
    this.removeProduct.emit(index);
  }
}
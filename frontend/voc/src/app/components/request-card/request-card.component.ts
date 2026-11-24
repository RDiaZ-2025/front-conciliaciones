import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { LucideIconComponent } from '../lucide-icon/lucide-icon.component';

@Component({
  selector: 'app-request-card',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    TagModule,
    ButtonModule,
    TooltipModule,
    LucideIconComponent
  ],
  templateUrl: './request-card.component.html',
  styleUrl: './request-card.component.scss'
})
export class RequestCardComponent {
  @Input({ required: true }) item!: any;
  @Input() mode: 'pending' | 'history' = 'pending';
  @Input() canAdmin = false;
  @Input() canReturn = false;
  @Input() showAssignedTo = false;
  @Input() isSavingPriority = false;
  @Input() formIcon = 'tag';
  @Input() formIconColor = 'text-secondary';
  @Input() tagSeverity: 'success' | 'info' | 'warn' | 'danger' | 'secondary' = 'info';
  @Input() tagLabel = '';
  @Input() isCorrection = false;
  @Input() formatCardValueFn?: (cf: any) => string;

  @Output() priorityTagClick = new EventEmitter<Event>();
  @Output() deleteClick = new EventEmitter<void>();
  @Output() actionClick = new EventEmitter<void>();
  @Output() returnClick = new EventEmitter<void>();
  @Output() detailsClick = new EventEmitter<void>();

  get displayId(): number | string {
    return this.item?.submissionId || this.item?.id;
  }

  get canEditPriority(): boolean {
    return this.mode === 'pending' && !!this.item?.canEditPriority;
  }

  get priorityCardClass(): string {
    const p = (this.item?.priority || '').toLowerCase();
    if (p === 'alta') return 'priority-card-alta';
    if (p === 'media') return 'priority-card-media';
    if (p === 'baja') return 'priority-card-baja';
    return '';
  }

  get priorityBadgeClass(): string {
    const p = (this.item?.priority || '').toLowerCase();
    if (p === 'alta') return 'priority-pill-alta';
    if (p === 'media') return 'priority-pill-media';
    if (p === 'baja') return 'priority-pill-baja';
    return '';
  }

  get priorityBtnClass(): string {
    const p = (this.item?.priority || '').toLowerCase();
    if (p === 'alta') return 'priority-btn-alta';
    if (p === 'media') return 'priority-btn-media';
    if (p === 'baja') return 'priority-btn-baja';
    return 'priority-btn-none';
  }

  get priorityIcon(): string {
    const p = (this.item?.priority || '').toLowerCase();
    if (p === 'alta') return 'alert-circle';
    if (p === 'media') return 'clock';
    if (p === 'baja') return 'check-circle';
    return 'tag';
  }

  get priorityLabel(): string {
    const p = (this.item?.priority || '').toLowerCase();
    if (p === 'alta') return 'PRIORIDAD ALTA';
    if (p === 'media') return 'PRIORIDAD MEDIA';
    if (p === 'baja') return 'PRIORIDAD BAJA';
    return '';
  }

  get priorityTagColorClass(): string {
    const p = (this.item?.priority || '').toLowerCase();
    if (p === 'alta') return 'priority-tag-alta';
    if (p === 'media') return 'priority-tag-media';
    if (p === 'baja') return 'priority-tag-baja';
    return this.formIconColor;
  }

  get priorityDotClass(): string {
    const p = (this.item?.priority || '').toLowerCase();
    if (p === 'alta') return 'priority-dot-alta';
    if (p === 'media') return 'priority-dot-media';
    if (p === 'baja') return 'priority-dot-baja';
    return 'priority-dot-none';
  }

  get priorityTooltip(): string {
    if (!this.canEditPriority) return '';
    if (this.item?.priority) {
      return `Prioridad ${this.item.priority} (haz clic para cambiarla o quitarla)`;
    }
    return 'Haz clic para asignar prioridad a tu etapa';
  }

  get showDeleteButton(): boolean {
    if (!this.canAdmin) return false;
    if (this.mode === 'history' && this.item?.status === 'Deleted') return false;
    return true;
  }

  formatCardValue(cf: any): string {
    return this.formatCardValueFn ? this.formatCardValueFn(cf) : String(cf?.value ?? '');
  }
}

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideIconComponent } from '../lucide-icon/lucide-icon.component';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule, LucideIconComponent],
  templateUrl: './page-header.component.html',
  styleUrl: './page-header.component.scss'
})
export class PageHeaderComponent {
  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() icon: string = 'info';
}

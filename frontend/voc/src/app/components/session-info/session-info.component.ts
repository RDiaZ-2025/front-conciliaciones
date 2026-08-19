import { LucideIconComponent } from '../lucide-icon/lucide-icon.component';
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-session-info',
  standalone: true,
  imports: [
    LucideIconComponent,CommonModule, CardModule],
  templateUrl: './session-info.component.html',
  styleUrl: './session-info.component.scss'
})
export class SessionInfoComponent {
  private authService = inject(AuthService);
  currentUser = this.authService.currentUser;
}

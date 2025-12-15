import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-session-info',
  standalone: true,
  imports: [CommonModule, CardModule],
  templateUrl: './session-info.html',
  styleUrl: './session-info.scss'
})
export class SessionInfoComponent {
  private authService = inject(AuthService);
  currentUser = this.authService.currentUser;
}

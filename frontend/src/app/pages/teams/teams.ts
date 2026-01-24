import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { TeamDialogComponent } from './team-dialog/team-dialog';
import { TeamService } from '../../services/team.service';
import { Team } from '../production/production.models';

@Component({
  selector: 'app-teams',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    ToastModule,
    TooltipModule,
    ConfirmDialogModule,
    PageHeaderComponent,
    TeamDialogComponent
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './teams.html',
  styleUrl: './teams.scss'
})
export class TeamsComponent implements OnInit {
  private teamService = inject(TeamService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  teams = signal<Team[]>([]);
  loading = signal<boolean>(false);
  dialogVisible = signal<boolean>(false);
  editingTeam = signal<Team | null>(null);

  ngOnInit() {
    this.loadTeams();
  }

  loadTeams() {
    this.loading.set(true);
    this.teamService.getTeams().subscribe({
      next: (response) => {
        if (response.success) {
          this.teams.set(response.data);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al cargar equipos' });
        this.loading.set(false);
      }
    });
  }

  openNew() {
    this.editingTeam.set(null);
    this.dialogVisible.set(true);
  }

  editTeam(team: Team) {
    this.editingTeam.set(team);
    this.dialogVisible.set(true);
  }

  deleteTeam(team: Team) {
    this.confirmationService.confirm({
      message: '¿Está seguro de eliminar este equipo?',
      header: 'Confirmar',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loading.set(true);
        this.teamService.deleteTeam(team.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Equipo eliminado' });
            this.loadTeams();
          },
          error: (err) => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al eliminar equipo' });
            this.loading.set(false);
          }
        });
      }
    });
  }

  onSave() {
    this.dialogVisible.set(false);
    this.loadTeams();
  }
}

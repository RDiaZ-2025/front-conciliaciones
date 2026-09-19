import { LucideIconComponent } from '../../components/lucide-icon/lucide-icon.component';
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { BadgeModule } from 'primeng/badge';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { TeamDialogComponent } from './team-dialog/team-dialog.component';
import { SubteamDialogComponent } from './subteam-dialog/subteam-dialog.component';
import { SubteamMembersDialogComponent } from './subteam-members-dialog/subteam-members-dialog.component';
import { TeamService } from '../../services/team.service';
import { Team } from '../../models/common/team';
import { Subteam } from '../../models/common/subteam';

@Component({
  selector: 'app-teams',
  standalone: true,
  imports: [
    LucideIconComponent,
    CommonModule,
    TableModule,
    ButtonModule,
    ToastModule,
    TooltipModule,
    TagModule,
    BadgeModule,
    ConfirmDialogModule,
    PageHeaderComponent,
    TeamDialogComponent,
    SubteamDialogComponent,
    SubteamMembersDialogComponent
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './teams.component.html',
  styleUrl: './teams.component.scss'
})
export class TeamsComponent implements OnInit {
  private teamService = inject(TeamService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  teams = signal<Team[]>([]);
  loading = signal<boolean>(false);
  dialogVisible = signal<boolean>(false);
  editingTeam = signal<Team | null>(null);

  // Tabs de navegación
  activeTab = signal<'teams' | 'subteams'>('teams');

  // Listado plano de todos los subequipos con su equipo padre
  allSubteams = computed(() => {
    const result: Array<Subteam & { parentTeam: Team }> = [];
    for (const team of this.teams()) {
      if (team.subteams && team.subteams.length > 0) {
        for (const sub of team.subteams) {
          result.push({ ...sub, parentTeam: team });
        }
      }
    }
    return result;
  });

  // Subequipos
  subteamDialogVisible = signal<boolean>(false);
  selectedTeamForSubteam = signal<Team | null>(null);
  editingSubteam = signal<Subteam | null>(null);

  // Integrantes de Subequipo
  subteamMembersDialogVisible = signal<boolean>(false);
  selectedSubteamForMembers = signal<Subteam | null>(null);

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

  getConditionCount(team: any): number {
    if (!team || !team.metadata) return 0;
    try {
      const meta = typeof team.metadata === 'string' ? JSON.parse(team.metadata) : team.metadata;
      return Array.isArray(meta?.enableConditions) ? meta.enableConditions.length : 0;
    } catch {
      return 0;
    }
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
      message: '¿Está seguro de eliminar este equipo? Se eliminarán también sus subequipos asociados.',
      header: 'Confirmar Eliminación',
      icon: 'alert-triangle',
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

  // Métodos de Subequipos
  openNewSubteam(team: Team) {
    this.selectedTeamForSubteam.set(team);
    this.editingSubteam.set(null);
    this.subteamDialogVisible.set(true);
  }

  editSubteam(team: Team, subteam: Subteam) {
    this.selectedTeamForSubteam.set(team);
    this.editingSubteam.set(subteam);
    this.subteamDialogVisible.set(true);
  }

  deleteSubteam(subteam: Subteam) {
    this.confirmationService.confirm({
      message: `¿Está seguro de eliminar el subequipo "${subteam.name}"?`,
      header: 'Confirmar Eliminación',
      icon: 'alert-triangle',
      accept: () => {
        this.loading.set(true);
        this.teamService.deleteSubteam(subteam.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Subequipo eliminado' });
            this.loadTeams();
          },
          error: (err) => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al eliminar subequipo' });
            this.loading.set(false);
          }
        });
      }
    });
  }

  onSubteamSave() {
    this.subteamDialogVisible.set(false);
    this.loadTeams();
  }

  openSubteamMembers(team: Team, subteam: Subteam) {
    this.selectedTeamForSubteam.set(team);
    this.selectedSubteamForMembers.set(subteam);
    this.subteamMembersDialogVisible.set(true);
  }

  onSubteamMembersSaved() {
    this.loadTeams();
  }
}

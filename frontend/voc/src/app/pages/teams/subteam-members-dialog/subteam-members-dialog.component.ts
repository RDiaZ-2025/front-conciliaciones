import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { BadgeModule } from 'primeng/badge';
import { MessageService, ConfirmationService } from 'primeng/api';
import { LucideIconComponent } from '../../../components/lucide-icon/lucide-icon.component';
import { TeamService } from '../../../services/team.service';
import { UserService, User } from '../../../services/user.service';
import { Team } from '../../../models/common/team';
import { Subteam } from '../../../models/common/subteam';

@Component({
  selector: 'app-subteam-members-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    MultiSelectModule,
    TooltipModule,
    TagModule,
    BadgeModule,
    LucideIconComponent
  ],
  templateUrl: './subteam-members-dialog.component.html',
  styleUrl: './subteam-members-dialog.component.scss'
})
export class SubteamMembersDialogComponent implements OnChanges {
  private teamService = inject(TeamService);
  private userService = inject(UserService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Input() subteam: Subteam | null = null;
  @Input() team: Team | null = null;
  @Output() save = new EventEmitter<void>();

  loadingMembers = signal<boolean>(false);
  members = signal<User[]>([]);
  allUsers = signal<User[]>([]);
  selectedUserIdsToAdd = signal<number[]>([]);
  saving = signal<boolean>(false);
  searchTerm = signal<string>('');

  availableUsersToAdd = computed(() => {
    const currentMemberIds = new Set(this.members().map(m => m.id));
    return this.allUsers().filter(u => !currentMemberIds.has(u.id));
  });

  filteredMembers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const list = this.members();
    if (!term) return list;
    return list.filter(u =>
      (u.name && u.name.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.teamName && u.teamName.toLowerCase().includes(term)) ||
      ((u as any).team?.name && (u as any).team.name.toLowerCase().includes(term))
    );
  });

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible'] && this.visible) {
      this.selectedUserIdsToAdd.set([]);
      this.searchTerm.set('');
      this.loadAllUsers();
      this.loadMembers();
    }
  }

  loadAllUsers() {
    this.userService.getAllUsers().subscribe({
      next: (list) => {
        const active = (list || []).filter((u: any) => u.status === 1 || u.status === undefined);
        this.allUsers.set(active);
      },
      error: () => {}
    });
  }

  loadMembers() {
    if (!this.subteam) {
      this.members.set([]);
      return;
    }

    this.loadingMembers.set(true);
    this.teamService.getSubteamUsers(this.subteam.id).subscribe({
      next: (res) => {
        this.members.set(res.data || []);
        this.loadingMembers.set(false);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los participantes del subequipo.'
        });
        this.loadingMembers.set(false);
      }
    });
  }

  addMembers() {
    if (!this.subteam) return;
    const toAdd = this.selectedUserIdsToAdd();
    if (!toAdd || toAdd.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atención',
        detail: 'Selecciona al menos un usuario para agregar.'
      });
      return;
    }

    const currentIds = this.members().map(m => m.id);
    const combinedIds = Array.from(new Set([...currentIds, ...toAdd]));

    this.saving.set(true);
    this.teamService.updateSubteamUsers(this.subteam.id, combinedIds).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Agregados',
          detail: `${toAdd.length} participante(s) agregado(s) al subequipo.`
        });
        this.selectedUserIdsToAdd.set([]);
        this.saving.set(false);
        this.loadMembers();
        this.save.emit();
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err.error?.message || 'Error al agregar participantes.'
        });
        this.saving.set(false);
      }
    });
  }

  confirmRemoveMember(user: User) {
    if (!this.subteam) return;

    this.confirmationService.confirm({
      message: `¿Estás seguro de remover a "${user.name}" del subequipo "${this.subteam.name}"?`,
      header: 'Remover Participante',
      icon: 'alert-triangle',
      acceptLabel: 'Sí, remover',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger p-button-sm',
      rejectButtonStyleClass: 'p-button-text p-button-sm',
      accept: () => {
        this.removeMember(user);
      }
    });
  }

  private removeMember(user: User) {
    if (!this.subteam) return;

    const remainingIds = this.members().map(m => m.id).filter(id => id !== user.id);

    this.saving.set(true);
    this.teamService.updateSubteamUsers(this.subteam.id, remainingIds).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'info',
          summary: 'Removido',
          detail: `El usuario "${user.name}" fue removido del subequipo.`
        });
        this.saving.set(false);
        this.loadMembers();
        this.save.emit();
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err.error?.message || 'Error al remover el participante.'
        });
        this.saving.set(false);
      }
    });
  }

  isLeader(user: User): boolean {
    return !!(this.subteam && this.subteam.leaderId === user.id);
  }

  getUserTeam(user: User): string {
    return user.teamName || (user as any).team?.name || 'Sin equipo asignado';
  }

  getInitials(name: string): string {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  close() {
    this.visibleChange.emit(false);
  }
}

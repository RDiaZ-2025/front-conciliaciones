import { Component, Input, Output, EventEmitter, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EntityStats, DashboardService, EntityDetail } from '../../../../services/dashboard.service';
import { EntityDetailComponent } from '../entity-detail/entity-detail.component';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-entities-tab',
    standalone: true,
    imports: [CommonModule, EntityDetailComponent, FormsModule],
    templateUrl: './entities-tab.component.html',
    styleUrls: ['./entities-tab.component.scss']
})
export class EntitiesTabComponent {
    @Input() data: EntityStats | null = null;
    @Input() currentFilters: any = {};
    @Output() drillDown = new EventEmitter<{ category?: string }>();

    selectedEntityDetail: EntityDetail | null = null;
    isDetailLoading = false;
    searchTerm = '';

    get filteredEntities() {
        if (!this.data) return [];
        if (!this.searchTerm) return this.data.entities;

        const term = this.searchTerm.toLowerCase();
        return this.data.entities.filter(ent =>
            ent.entity.toLowerCase().includes(term)
        );
    }

    private dashboardService = inject(DashboardService);
    private cdr = inject(ChangeDetectorRef);

    onEntityClick(entity: string) {
        if (this.isDetailLoading) return;

        this.isDetailLoading = true;
        this.cdr.detectChanges(); // Ensure blur shows immediately

        this.dashboardService.getEntityDetail(entity, this.currentFilters).subscribe({
            next: (detail) => {
                this.selectedEntityDetail = detail;
                this.isDetailLoading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error loading entity detail:', err);
                this.isDetailLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    getSemaphore(ent: any): { icon: string, color: string, label: string } {
        const quality = (ent.semantic_score + ent.syntactic_score) / 2;
        const er = ent.engagement_score;
        const avg = this.data?.section_avg || 15;

        if (er >= avg && quality >= 0.92) return { icon: '🟢', color: 'text-emerald-500', label: '¡Estrella!: Tráfico sobre la media con redacción impecable.' };
        if (er < avg && quality >= 0.92) return { icon: '🟡', color: 'text-amber-400', label: 'Oportunidad: Textos excelentes pero no están atrayendo clics. Sugerimos cambiar enfoque/titular.' };
        if (er >= avg && quality < 0.88) return { icon: '🔴', color: 'text-red-500', label: 'Cuidado: Alto tráfico, pero la calidad del texto es inferior al promedio general.' };
        return { icon: '⚪', color: 'text-muted', label: 'Estándar: Mantiene niveles promedio de tráfico y calidad.' };
    }

    getSparklinePoints(data: number[]): string {
        if (!data || data.length === 0) return '';
        const max = Math.max(...data, 1);
        const width = 100;
        const height = 30;
        const step = width / (data.length - 1);

        return data.map((val, i) => `${i * step},${height - (val / max * height)}`).join(' ');
    }

    closeDetail() {
        this.selectedEntityDetail = null;
        this.cdr.detectChanges();
    }
}

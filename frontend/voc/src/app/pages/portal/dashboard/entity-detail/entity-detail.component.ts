import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EntityDetail } from '../../../../services/dashboard.service';

@Component({
    selector: 'app-entity-detail',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div *ngIf="data" class="animate-fade-in-up space-y-8">
            <!-- Header with Back Button and AI Verdict -->
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <button (click)="close.emit()" class="flex items-center text-muted hover:text-primary transition-colors font-bold uppercase text-xs tracking-widest">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
                    </svg>
                    Volver al listado
                </button>
            </div>

            <!-- MAIN ENTITY CARD -->
            <div class="glass-effect rounded-[32px] border border-main p-4 space-y-8 bg-white/5 relative overflow-hidden shadow-2xl">
                <div class="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent z-0 pointer-events-none"></div>
                
                <div class="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div class="flex items-center gap-4 flex-wrap">
                        <span class="px-3 py-1 font-bold text-[10px] uppercase rounded border"
                              [ngClass]="getBadgeClass(data.type)">
                            {{ data.type || 'Tema' }}
                        </span>
                        <h2 class="text-3xl font-bold text-main tracking-tight">{{ data.entity }}</h2>
                        <div class="px-4 py-1.5 bg-emerald-900/40 text-emerald-400 border border-emerald-500/30 font-bold text-xs uppercase rounded-full tracking-widest">
                            {{ data.metrics.engagement }}% ER
                        </div>
                    </div>
                </div>
                
                <div class="text-xs text-muted font-bold tracking-widest uppercase">
                    {{ data.metrics.total_sessions | number }} sesiones analizadas
                </div>

                <!-- Metrics Overview -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                    
                    <!-- Top Author -->
                    <div class="glass-effect p-4 rounded-3xl border border-muted flex flex-col items-center justify-center text-center">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="w-2 h-2 rounded-full bg-orange-500"></span>
                            <div class="text-[10px] font-bold text-muted uppercase tracking-widest">Mejor Autor</div>
                        </div>
                        <div *ngIf="data.data_insights.top_author; else noAuthor" class="text-xl font-bold text-orange-400 capitalize tracking-tighter">
                            {{ data.data_insights.top_author.toLowerCase() }}
                        </div>
                        <ng-template #noAuthor>
                            <div class="text-sm font-bold text-muted">Aún no determinable</div>
                        </ng-template>
                    </div>
                    
                    <!-- Quality Metrics: Only show if > 0 -->
                    <div *ngIf="data.metrics.semantic > 0; else noSemantic" class="glass-effect p-4 rounded-3xl border border-muted flex flex-col items-center justify-center text-center">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="w-2 h-2 rounded-full bg-blue-500"></span>
                            <div class="text-[10px] font-bold text-muted uppercase tracking-widest">Score Semántico</div>
                        </div>
                        <div class="text-3xl font-bold text-blue-400">{{ data.metrics.semantic }}</div>
                        <div class="w-full bg-muted h-1 rounded-full mt-4 overflow-hidden">
                            <div class="h-full bg-blue-500" [style.width.%]="data.metrics.semantic"></div>
                        </div>
                        <div class="text-[9px] text-muted font-bold mt-2 uppercase tracking-widest">Profundidad</div>
                    </div>
                    <ng-template #noSemantic>
                        <div class="glass-effect p-4 rounded-3xl border border-muted flex flex-col items-center justify-center text-center opacity-50">
                            <div class="text-[10px] font-bold text-muted uppercase tracking-widest mb-2">Score Semántico</div>
                            <div class="text-sm font-bold text-muted">No medible</div>
                        </div>
                    </ng-template>

                    <div *ngIf="data.metrics.syntactic > 0; else noSyntactic" class="glass-effect p-4 rounded-3xl border border-muted flex flex-col items-center justify-center text-center">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="w-2 h-2 rounded-full bg-amber-500"></span>
                            <div class="text-[10px] font-bold text-muted uppercase tracking-widest">Score Sintáctico</div>
                        </div>
                        <div class="text-3xl font-bold text-amber-400">{{ data.metrics.syntactic }}</div>
                        <div class="w-full bg-muted h-1 rounded-full mt-4 overflow-hidden">
                            <div class="h-full bg-amber-500" [style.width.%]="data.metrics.syntactic"></div>
                        </div>
                        <div class="text-[9px] text-muted font-bold mt-2 uppercase tracking-widest">Redacción</div>
                    </div>
                    <ng-template #noSyntactic>
                         <div class="glass-effect p-4 rounded-3xl border border-muted flex flex-col items-center justify-center text-center opacity-50">
                            <div class="text-[10px] font-bold text-muted uppercase tracking-widest mb-2">Score Sintáctico</div>
                            <div class="text-sm font-bold text-muted">No medible</div>
                        </div>
                    </ng-template>
                </div>

                <!-- Insights Block -->
                <div *ngIf="data.data_insights.best_topic || data.data_insights.ideal_section" class="relative z-10 p-4 bg-primary/5 border border-primary/20 rounded-3xl">
                    <h5 class="font-bold text-primary text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        Sugerencias 
                    </h5>
                    <div class="space-y-2">
                        <p class="text-sm text-main leading-relaxed" *ngIf="data.data_insights.best_topic">
                            <span class="font-bold text-primary/80 mr-2">🎯 MEJOR TEMA:</span> {{ data.data_insights.best_topic }}
                        </p>
                        <p class="text-sm text-main leading-relaxed" *ngIf="data.data_insights.ideal_section">
                            <span class="font-bold text-primary/80 mr-2">📍 MEJOR SECCIÓN:</span> {{ data.data_insights.ideal_section }}
                        </p>
                        <p class="text-sm text-main leading-relaxed" *ngIf="data.data_insights.suggested_combo">
                            <span class="font-bold text-primary/80 mr-2">🤝 MEJOR COMPAÑÍA:</span> {{ data.data_insights.suggested_combo }}
                        </p>
                    </div>
                </div>

                <!-- Suggested Combinations -->
                <div *ngIf="data.suggested_partners && data.suggested_partners.length > 0" class="relative z-10 pt-4 border-t border-muted">
                    <div class="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">Entidades sugeridas para mencionar junto</div>
                    <div class="flex flex-wrap gap-2">
                        <span *ngFor="let p of data.suggested_partners" class="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-main">
                            + {{ p }}
                        </span>
                    </div>
                </div>
            </div>

            <!-- SECONDARY ENTITIES TITLE -->
            <div class="flex items-center gap-3 pt-4">
                <span class="text-xs font-bold text-muted uppercase tracking-widest">Entidades Secundarias Detectadas</span>
                <div class="flex-grow h-px bg-muted"></div>
            </div>

            <!-- SECONDARY ENTITIES ACCORDION -->
            <div class="space-y-4">
                <div *ngIf="data.secondary_entities.length === 0" class="text-center py-10 opacity-50">
                    <div class="text-sm font-bold text-muted">No se detectaron entidades secundarias con datos relevantes.</div>
                </div>

                <div *ngFor="let sec of data.secondary_entities; let i = index" 
                     class="glass-effect rounded-2xl border transition-all duration-300 overflow-hidden"
                     [ngClass]="expandedEntity === sec.name ? 'border-primary/50 bg-white/5 shadow-[0_0_20px_var(--primary-glow)]' : 'border-muted hover:border-white/20'">
                     
                     <!-- Accordion Header -->
                     <button (click)="toggleEntity(sec.name)" class="w-full flex items-center justify-between p-4 text-left focus:outline-none">
                        <div class="flex items-center gap-4">
                            <span class="px-2 py-0.5 font-bold text-[9px] uppercase rounded border" [ngClass]="getBadgeClass(sec.type)">
                                {{ sec.type }}
                            </span>
                            <span class="font-bold text-main text-base">{{ sec.name }}</span>
                        </div>
                        <div class="flex items-center gap-4">
                            <span class="px-3 py-1 bg-emerald-900/30 text-emerald-400 font-bold text-xs rounded-full">
                                {{ sec.er }}% ER
                            </span>
                        </div>
                     </button>

                     <!-- Accordion Body -->
                     <div *ngIf="expandedEntity === sec.name" class="px-4 pb-4 pt-2 border-t border-white/5 animate-fade-in-up">
                        <div class="text-xs text-muted font-bold tracking-widest uppercase mb-4">
                            Categoría: <span class="text-main">{{ sec.category }}</span>
                        </div>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div class="bg-white/5 p-4 rounded-xl border border-white/5 flex flex-col">
                                <span class="text-[9px] font-bold text-muted uppercase tracking-widest mb-1">Score Semántico</span>
                                <div class="text-xl font-bold" [ngClass]="sec.semantic > 0 ? 'text-blue-400' : 'text-muted'">
                                    {{ sec.semantic > 0 ? sec.semantic : 'N/A' }}
                                </div>
                                <div class="w-full bg-muted h-1 rounded-full mt-2 overflow-hidden" *ngIf="sec.semantic > 0">
                                    <div class="h-full bg-blue-500" [style.width.%]="sec.semantic"></div>
                                </div>
                            </div>
                            <div class="bg-white/5 p-4 rounded-xl border border-white/5 flex flex-col">
                                <span class="text-[9px] font-bold text-muted uppercase tracking-widest mb-1">Score Sintáctico</span>
                                <div class="text-xl font-bold" [ngClass]="sec.syntactic > 0 ? 'text-amber-400' : 'text-muted'">
                                    {{ sec.syntactic > 0 ? sec.syntactic : 'N/A' }}
                                </div>
                                <div class="w-full bg-muted h-1 rounded-full mt-2 overflow-hidden" *ngIf="sec.syntactic > 0">
                                    <div class="h-full bg-amber-500" [style.width.%]="sec.syntactic"></div>
                                </div>
                            </div>
                        </div>

                        <div class="p-4 bg-primary/5 border border-primary/10 rounded-xl">
                            <p class="text-sm font-medium text-main text-opacity-90 leading-relaxed">{{ sec.insight }}</p>
                        </div>
                     </div>
                </div>
            </div>

            <!-- Top Articles List -->
            <div *ngIf="data.top_articles && data.top_articles.length > 0" class="pt-8">
                <div class="glass-effect p-4 rounded-[32px] border border-main">
                    <h4 class="font-bold text-main text-lg mb-6 flex items-center uppercase tracking-tighter">
                        <span class="w-1.5 h-6 bg-primary rounded-full mr-3"></span>
                        Artículos con Mayor Impacto
                    </h4>
                    <div class="space-y-4">
                        <div *ngFor="let art of data.top_articles" class="p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors group">
                            <div class="flex justify-between items-start mb-2">
                                <h5 class="text-sm font-semibold text-main group-hover:text-primary transition-colors pr-10 leading-tight">{{ art.title }}</h5>
                                <div class="text-right flex-shrink-0">
                                    <div class="text-xs font-bold text-primary">{{ art.er }}% ER</div>
                                    <div class="text-[10px] text-muted font-bold">{{ art.sessions }} sess.</div>
                                </div>
                            </div>
                            <div class="text-[10px] text-semibold uppercase tracking-widest">{{ art.date }}</div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    `,
    styles: [`
        .glass-effect {
            background: rgba(255, 255, 255, 0.02);
            backdrop-filter: blur(10px);
        }
        .animate-fade-in-up {
            animation: fadeInUp 0.4s ease-out;
        }
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `]
})
export class EntityDetailComponent implements OnInit {
    @Input() data: EntityDetail | null = null;
    @Output() close = new EventEmitter<void>();

    expandedEntity: string | null = null;
    
    ngOnInit() {
        const workArea = document.querySelector('.work-area');
        if (workArea) {
            workArea.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
    
    toggleEntity(name: string) {
        if (this.expandedEntity === name) {
            this.expandedEntity = null;
        } else {
            this.expandedEntity = name;
        }
    }

    getBadgeClass(type: string): string {
        switch(type?.toLowerCase()) {
            case 'org': return 'bg-blue-400/20 text-blue-400 border-blue-400/30';
            case 'persona': return 'bg-primary/20 text-primary border-primary/30';
            case 'lugar': return 'bg-amber-400/20 text-amber-400 border-amber-400/30';
            case 'tema': return 'bg-orange-400/20 text-orange-400 border-orange-400/30';
            default: return 'bg-slate-400/20 text-slate-400 border-slate-400/30';
        }
    }
}

import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { DashboardEntity } from './Entity';

@Entity('dashboard_data')
export class DashboardData {
    @PrimaryGeneratedColumn({ name: 'id' })
    id!: number;

    @Column({ name: 'rank_seccion', type: 'int', nullable: true })
    rankSeccion!: number | null;

    @Column({ name: 'mes', type: 'nvarchar', length: 255, nullable: true })
    mes!: string | null;

    @Column({ name: 'seccion', type: 'nvarchar', length: 255, nullable: true })
    seccion!: string | null;

    @Column({ name: 'fecha_url', type: 'date', nullable: true })
    fechaUrl!: Date | null;

    @Column({ name: 'clean_url', type: 'nvarchar', length: 255, nullable: true })
    cleanUrl!: string | null;

    @Column({ name: 'titulo_url', type: 'nvarchar', length: 255, nullable: true })
    tituloUrl!: string | null;

    @Column({ name: 'autor', type: 'nvarchar', length: 255, nullable: true })
    autor!: string | null;

    @Column({ name: 'total_users', type: 'int', nullable: true })
    totalUsers!: number | null;

    @Column({ name: 'screen_page_views', type: 'int', nullable: true })
    screenPageViews!: number | null;

    @Column({ name: 'sessions', type: 'int', nullable: true })
    sessions!: number | null;

    @Column({ name: 'engaged_sessions', type: 'int', nullable: true })
    engagedSessions!: number | null;

    @Column({ name: 'tema_principal', type: 'nvarchar', length: 255, nullable: true })
    temaPrincipal!: string | null;

    @Column({ name: 'categoria_entidad', type: 'nvarchar', length: 255, nullable: true })
    categoriaEntidad!: string | null;

    @Column({ name: 'fuente', type: 'nvarchar', length: 255, nullable: true, default: 'Discover' })
    fuente!: string | null;

    @Column({ name: 'entidad_principal', type: 'nvarchar', length: 255, nullable: true })
    entidadPrincipal!: string | null;

    @Column({ name: 'semantic_score', type: 'float', nullable: true })
    semanticScore!: number | null;

    @Column({ name: 'syntactic_score', type: 'float', nullable: true })
    syntacticScore!: number | null;

    @Column({ name: 'analisis_gemini_raw', type: 'nvarchar', length: 'MAX', nullable: true })
    analisisGeminiRaw!: string | null;

    @OneToMany(() => DashboardEntity, entity => entity.article, { cascade: true })
    entities!: DashboardEntity[];
}

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { DashboardData } from './DashboardData';

@Entity('entities')
export class DashboardEntity {
    @PrimaryGeneratedColumn({ name: 'id' })
    id!: number;

    @Column({ name: 'dashboard_data_id', type: 'int', nullable: false })
    dashboardDataId!: number;

    @Column({ name: 'name', type: 'nvarchar', length: 255, nullable: false })
    name!: string;

    @Column({ name: 'type', type: 'nvarchar', length: 255, nullable: true, default: 'Tema' })
    type!: string | null;

    @Column({ name: 'is_principal', type: 'bit', default: false, nullable: false })
    isPrincipal!: boolean;

    @Column({ name: 'semantic_score', type: 'float', nullable: true })
    semanticScore!: number | null;

    @Column({ name: 'syntactic_score', type: 'float', nullable: true })
    syntacticScore!: number | null;

    @ManyToOne(() => DashboardData, article => article.entities, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'dashboard_data_id' })
    article!: DashboardData;
}

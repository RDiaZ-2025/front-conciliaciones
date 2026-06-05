import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('ingreso_redes')
export class IngresoRedes {
    @PrimaryGeneratedColumn({ name: 'id' })
    id!: number;

    @Column({ name: 'Mes', type: 'date', nullable: false })
    mes!: Date;

    @Column({ name: 'Plataforma', type: 'nvarchar', length: 50, nullable: false })
    plataforma!: string;

    @Column({ name: 'TotalBruto', type: 'float', nullable: true })
    totalBruto!: number | null;

    @Column({ name: 'Retencion', type: 'float', nullable: true })
    retencion!: number | null;

    @Column({ name: 'TotalNeto', type: 'float', nullable: true })
    totalNeto!: number | null;

    @Column({ name: 'RedMasTv', type: 'float', nullable: true })
    redMasTv!: number | null;

    @Column({ name: 'RedMasNoticias', type: 'float', nullable: true })
    redMasNoticias!: number | null;

    @Column({ name: 'QuinceMinutos', type: 'float', nullable: true })
    quinceMinutos!: number | null;

    @Column({ name: 'RadiolaTv', type: 'float', nullable: true })
    radiolaTv!: number | null;
}

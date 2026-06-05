import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('presupuesto')
export class Presupuesto {
    @PrimaryGeneratedColumn({ name: 'id' })
    id!: number;

    @Column({ name: 'Fecha', type: 'date', nullable: false })
    fecha!: Date;

    @Column({ name: 'Seccion', type: 'nvarchar', length: 100, nullable: true })
    seccion!: string | null;

    @Column({ name: 'Fuente', type: 'nvarchar', length: 100, nullable: true })
    fuente!: string | null;

    @Column({ name: 'Ppto', type: 'float', nullable: true, default: 0.0 })
    ppto!: number | null;

    @Column({ name: 'Ejecucion', type: 'float', nullable: true, default: 0.0 })
    ejecucion!: number | null;
}

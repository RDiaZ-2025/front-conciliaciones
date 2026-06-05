import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('ingreso_portal')
export class IngresoPortal {
    @PrimaryGeneratedColumn({ name: 'id' })
    id!: number;

    @Column({ name: 'Fecha', type: 'date', nullable: true })
    fecha!: Date | null;

    @Column({ name: 'ImpresionesTotales', type: 'int', nullable: true })
    impresionesTotales!: number | null;

    @Column({ name: 'ImpresionesSinRellenar', type: 'int', nullable: true })
    impresionesSinRellenar!: number | null;

    @Column({ name: 'PromedioAdExchange', type: 'float', nullable: true })
    promedioAdExchange!: number | null;

    @Column({ name: 'IngresosAdExchange', type: 'float', nullable: true })
    ingresosAdExchange!: number | null;

    @Column({ name: 'USD', type: 'float', nullable: true })
    usd!: number | null;

    @Column({ name: 'COP', type: 'int', nullable: true })
    cop!: number | null;
}

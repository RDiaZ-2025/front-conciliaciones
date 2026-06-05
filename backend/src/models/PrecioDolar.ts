import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('precio_dolar')
export class PrecioDolar {
    @PrimaryGeneratedColumn({ name: 'id' })
    id!: number;

    @Column({ name: 'Mes', type: 'date', nullable: false, unique: true })
    mes!: Date;

    @Column({ name: 'Precio', type: 'float', nullable: false })
    precio!: number;
}

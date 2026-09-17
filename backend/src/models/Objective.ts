import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('Objectives')
export class Objective {
    @PrimaryGeneratedColumn({ name: 'Id' })
    id!: number;

    @Column({ name: 'Name', type: 'nvarchar', length: 255, nullable: false })
    name!: string;
}

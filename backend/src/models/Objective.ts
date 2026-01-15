import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

/**
 * Objective entity representing campaign objectives
 * Maps to Objectives table in the database
 */
@Entity('Objectives')
export class Objective {
    @PrimaryGeneratedColumn({ name: 'Id' })
    id!: number;

    @Column({ name: 'Name', type: 'nvarchar', length: 255, nullable: false })
    name!: string;
}

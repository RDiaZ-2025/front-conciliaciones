import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('RightsDurations')
export class RightsDuration {
    @PrimaryGeneratedColumn({ name: 'Id' })
    id!: number;

    @Column({ name: 'Name', type: 'nvarchar', length: 100, nullable: false })
    name!: string;
}

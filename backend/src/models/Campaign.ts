import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Team } from './Team';
import { User } from './User';

@Entity('Campaigns')
export class Campaign {
    @PrimaryGeneratedColumn({ name: 'Id' })
    id!: number;

    @Column({ name: 'Name', type: 'nvarchar', length: 255, nullable: false })
    name!: string;

    @Column({ name: 'TeamId', type: 'int', nullable: false })
    teamId!: number;

    @ManyToOne(() => Team)
    @JoinColumn({ name: 'TeamId' })
    team!: Team;

    @Column({ name: 'Slot', type: 'nvarchar', length: 100, nullable: false })
    slot!: string;

    @Column({ name: 'Copy', type: 'nvarchar', length: 500, nullable: false })
    copy!: string;

    @Column({ name: 'Url', type: 'nvarchar', length: 'MAX', nullable: false })
    url!: string;

    @Column({ name: 'StartDate', type: 'datetime', nullable: false })
    startDate!: Date;

    @Column({ name: 'EndDate', type: 'datetime', nullable: false })
    endDate!: Date;

    @Column({ name: 'Impacts', type: 'nvarchar', length: 'MAX', nullable: true })
    impacts!: string; // Stored as JSON string

    @Column({ name: 'CreatedBy', type: 'int', nullable: true })
    createdBy!: number | null;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'CreatedBy' })
    creator!: User;

    @CreateDateColumn({ name: 'CreatedAt', type: 'datetime' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'UpdatedAt', type: 'datetime' })
    updatedAt!: Date;
}

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { NocNewsScheduler } from './NocNewsScheduler';

@Entity('noc_news_drafts')
export class NocNewsDraft {
    @PrimaryGeneratedColumn({ name: 'id' })
    id!: number;

    @Column({ name: 'scheduleId', type: 'nvarchar', length: 36, nullable: false })
    scheduleId!: string;

    @Column({ name: 'path', type: 'nvarchar', length: 500, nullable: false })
    path!: string;

    @Column({ name: 'status', type: 'nvarchar', length: 50, nullable: false, default: 'pending' })
    status!: string; // 'pending', 'published'

    @CreateDateColumn({ name: 'createdAt', type: 'datetime2' })
    createdAt!: Date;

    @Column({ name: 'publishedAt', type: 'datetime2', nullable: true })
    publishedAt!: Date | null;

    @ManyToOne(() => NocNewsScheduler, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'scheduleId' })
    schedule!: NocNewsScheduler;
}

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { NocNewsScheduler } from './NocNewsScheduler';

@Entity('noc_news_drafts')
export class NocNewsDraft {
    @PrimaryGeneratedColumn({ name: 'id' })
    id!: number;

    @Column({ name: 'scheduleId', type: 'nvarchar', length: 36, nullable: false })
    scheduleId!: string;

    @Column({ name: 'title', type: 'nvarchar', length: 500, nullable: true })
    title!: string | null;

    @Column({ name: 'subtitle', type: 'nvarchar', length: 'MAX', nullable: true })
    subtitle!: string | null;

    @Column({ name: 'content', type: 'nvarchar', length: 'MAX', nullable: true })
    content!: string | null;

    @Column({ name: 'path', type: 'nvarchar', length: 500, nullable: true })
    path!: string | null;

    @Column({ name: 'status', type: 'nvarchar', length: 50, nullable: false, default: 'pending' })
    status!: string;

    @CreateDateColumn({ name: 'createdAt', type: 'datetime2' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updatedAt', type: 'datetime2', nullable: true })
    updatedAt!: Date | null;

    @Column({ name: 'publishedAt', type: 'datetime2', nullable: true })
    publishedAt!: Date | null;

    @ManyToOne(() => NocNewsScheduler, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'scheduleId' })
    schedule!: NocNewsScheduler;
}

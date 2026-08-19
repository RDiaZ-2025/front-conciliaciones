import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('noc_news_scheduler')
export class NocNewsScheduler {
    @PrimaryColumn({ name: 'id', type: 'nvarchar', length: 36 })
    id!: string;

    @Column({ name: 'name', type: 'nvarchar', length: 255, nullable: false })
    name!: string;

    @Column({ name: 'topic', type: 'nvarchar', length: 255, nullable: false })
    topic!: string;

    @Column({ name: 'userInstructions', type: 'nvarchar', length: 'MAX', nullable: true })
    userInstructions!: string | null;

    @Column({ name: 'sources', type: 'nvarchar', length: 'MAX', nullable: false })
    sources!: string; // Stored as JSON string array

    @Column({ name: 'url', type: 'nvarchar', length: 500, nullable: false })
    url!: string;

    @Column({ name: 'method', type: 'nvarchar', length: 10, nullable: false, default: 'POST' })
    method!: string;

    @Column({ name: 'startAt', type: 'datetime2', nullable: false })
    startAt!: Date;

    @Column({ name: 'intervalMinutes', type: 'int', nullable: false })
    intervalMinutes!: number;

    @Column({ name: 'cronExpression', type: 'nvarchar', length: 100, nullable: true })
    cronExpression!: string | null;

    @Column({ name: 'scheduleConfig', type: 'nvarchar', length: 'MAX', nullable: false })
    scheduleConfig!: string; // JSON string representing the schedule configuration

    @Column({ name: 'isActive', type: 'bit', nullable: false, default: 1 })
    isActive!: boolean;

    @Column({ name: 'publishAutomatically', type: 'bit', nullable: false, default: 0 })
    publishAutomatically!: boolean;

    @Column({ name: 'status', type: 'nvarchar', length: 20, nullable: false, default: 'Pending' })
    status!: string;

    @Column({ name: 'lastRunAt', type: 'datetime2', nullable: true })
    lastRunAt!: Date | null;

    @Column({ name: 'nextRunAt', type: 'datetime2', nullable: true })
    nextRunAt!: Date | null;

    @CreateDateColumn({ name: 'createdAt', type: 'datetime2' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updatedAt', type: 'datetime2' })
    updatedAt!: Date;
}

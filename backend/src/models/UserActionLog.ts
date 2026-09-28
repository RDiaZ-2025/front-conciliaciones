import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './User';

@Entity('UserActionLogs')
@Index('IX_UserActionLogs_UserId', ['userId'])
@Index('IX_UserActionLogs_Action', ['action'])
@Index('IX_UserActionLogs_CreatedAt', ['createdAt'])
@Index('IX_UserActionLogs_IpAddress', ['ipAddress'])
export class UserActionLog {

    @PrimaryGeneratedColumn({ name: 'Id' })
    id!: number;

    @Column({ name: 'UserId', type: 'int', nullable: true })
    userId!: number | null;

    @Column({ name: 'Method', type: 'varchar', length: 10, nullable: false })
    method!: string;

    @Column({ name: 'Url', type: 'varchar', length: 500, nullable: false })
    url!: string;

    @Column({ name: 'Action', type: 'varchar', length: 100, nullable: false })
    action!: string;

    @Column({ name: 'ResourceType', type: 'varchar', length: 50, nullable: true })
    resourceType!: string | null;

    @Column({ name: 'ResourceId', type: 'varchar', length: 50, nullable: true })
    resourceId!: string | null;

    @Column({ name: 'StatusCode', type: 'int', nullable: false })
    statusCode!: number;

    @Column({ name: 'IpAddress', type: 'varchar', length: 45, nullable: true })
    ipAddress!: string | null;

    @Column({ name: 'UserAgent', type: 'varchar', length: 500, nullable: true })
    userAgent!: string | null;

    @Column({ name: 'RequestBody', type: 'text', nullable: true })
    requestBody!: string | null;

    @Column({ name: 'ResponseBody', type: 'text', nullable: true })
    responseBody!: string | null;

    @Column({ name: 'Metadata', type: 'text', nullable: true })
    metadata!: string | null;

    @Column({ name: 'Duration', type: 'int', nullable: true })
    duration!: number | null;

    @Column({ name: 'ErrorMessage', type: 'text', nullable: true })
    errorMessage!: string | null;

    @CreateDateColumn({ name: 'CreatedAt', type: 'datetime' })
    createdAt!: Date;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'UserId' })
    user!: User | null;

    static createFromRequest(data: {
        userId?: number | null;
        method: string;
        url: string;
        action: string;
        resourceType?: string | null;
        resourceId?: string | null;
        statusCode: number;
        ipAddress?: string | null;
        userAgent?: string | null;
        requestBody?: unknown;
        responseBody?: unknown;
        metadata?: unknown;
        duration?: number | null;
        errorMessage?: string | null;
    }): UserActionLog {
        const log = new UserActionLog();
        log.userId = data.userId || null;
        log.method = data.method;
        log.url = data.url;
        log.action = data.action;
        log.resourceType = data.resourceType || null;
        log.resourceId = data.resourceId || null;
        log.statusCode = data.statusCode;
        log.ipAddress = data.ipAddress || null;
        log.userAgent = data.userAgent || null;
        log.requestBody = data.requestBody ? JSON.stringify(data.requestBody) : null;
        log.responseBody = data.responseBody ? JSON.stringify(data.responseBody) : null;
        log.metadata = data.metadata ? JSON.stringify(data.metadata) : null;
        log.duration = data.duration || null;
        log.errorMessage = data.errorMessage || null;
        return log;
    }
}

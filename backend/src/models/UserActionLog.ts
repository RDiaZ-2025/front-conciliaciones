import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './User';

/**
 * UserActionLog entity for tracking all user actions in the system
 * Maps to UserActionLogs table in the database
 */
@Entity('UserActionLogs')
@Index('IX_UserActionLogs_UserId', ['userId'])
@Index('IX_UserActionLogs_Action', ['action'])
@Index('IX_UserActionLogs_CreatedAt', ['createdAt'])
@Index('IX_UserActionLogs_IpAddress', ['ipAddress'])
export class UserActionLog {
    /**
     * Primary key - Auto-incrementing log ID
     */
    @PrimaryGeneratedColumn({ name: 'Id' })
    id!: number;

    /**
     * User ID who performed the action
     */
    @Column({ name: 'UserId', type: 'int', nullable: true })
    userId!: number | null;

    /**
     * HTTP method used (GET, POST, PUT, DELETE, etc.)
     */
    @Column({ name: 'Method', type: 'varchar', length: 10, nullable: false })
    method!: string;

    /**
     * URL/endpoint that was accessed
     */
    @Column({ name: 'Url', type: 'varchar', length: 500, nullable: false })
    url!: string;

    /**
     * Action performed (e.g., 'LOGIN', 'CREATE_USER', 'UPDATE_PRODUCTION', etc.)
     */
    @Column({ name: 'Action', type: 'varchar', length: 100, nullable: false })
    action!: string;

    /**
     * Resource type affected (e.g., 'USER', 'PRODUCTION_REQUEST', 'DOCUMENT', etc.)
     */
    @Column({ name: 'ResourceType', type: 'varchar', length: 50, nullable: true })
    resourceType!: string | null;

    /**
     * ID of the resource affected (if applicable)
     */
    @Column({ name: 'ResourceId', type: 'varchar', length: 50, nullable: true })
    resourceId!: string | null;

    /**
     * HTTP status code of the response
     */
    @Column({ name: 'StatusCode', type: 'int', nullable: false })
    statusCode!: number;

    /**
     * IP address of the client
     */
    @Column({ name: 'IpAddress', type: 'varchar', length: 45, nullable: true })
    ipAddress!: string | null;

    /**
     * User agent string from the request
     */
    @Column({ name: 'UserAgent', type: 'varchar', length: 500, nullable: true })
    userAgent!: string | null;

    /**
     * Request body (for POST/PUT requests) - stored as JSON string
     */
    @Column({ name: 'RequestBody', type: 'text', nullable: true })
    requestBody!: string | null;

    /**
     * Response body (if needed for auditing) - stored as JSON string
     */
    @Column({ name: 'ResponseBody', type: 'text', nullable: true })
    responseBody!: string | null;

    /**
     * Additional metadata or context about the action
     */
    @Column({ name: 'Metadata', type: 'text', nullable: true })
    metadata!: string | null;

    /**
     * Duration of the request in milliseconds
     */
    @Column({ name: 'Duration', type: 'int', nullable: true })
    duration!: number | null;

    /**
     * Error message if the action failed
     */
    @Column({ name: 'ErrorMessage', type: 'text', nullable: true })
    errorMessage!: string | null;

    /**
     * Record creation timestamp
     */
    @CreateDateColumn({ name: 'CreatedAt', type: 'datetime' })
    createdAt!: Date;

    /**
     * Relationship to User entity
     */
    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'UserId' })
    user!: User | null;

    /**
     * Helper method to create a log entry from request/response data
     */
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
        requestBody?: any;
        responseBody?: any;
        metadata?: any;
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
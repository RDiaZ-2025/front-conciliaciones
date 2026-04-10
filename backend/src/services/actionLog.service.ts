import { Repository, SelectQueryBuilder } from 'typeorm';
import { AppDataSource } from '../config/typeorm.config';
import { UserActionLog } from '../models/UserActionLog';
import { User } from '../models/User';

export interface ActionLogFilters {
    userId?: number;
    action?: string;
    resourceType?: string;
    method?: string;
    statusCode?: number;
    ipAddress?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
}

export interface ActionLogResponse {
    logs: UserActionLog[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export class ActionLogService {
    private actionLogRepository: Repository<UserActionLog>;

    constructor() {
        this.actionLogRepository = AppDataSource.getRepository(UserActionLog);
    }

    /**
     * Get action logs with filtering and pagination
     */
    async getActionLogs(filters: ActionLogFilters = {}): Promise<ActionLogResponse> {
        const {
            userId,
            action,
            resourceType,
            method,
            statusCode,
            ipAddress,
            startDate,
            endDate,
            page = 1,
            limit = 50
        } = filters;

        const queryBuilder = this.actionLogRepository
            .createQueryBuilder('log')
            .leftJoinAndSelect('log.user', 'user')
            .orderBy('log.createdAt', 'DESC');

        this.applyFilters(queryBuilder, filters);

        const total = await queryBuilder.getCount();
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;

        const logs = await queryBuilder
            .skip(offset)
            .take(limit)
            .getMany();

        return {
            logs,
            total,
            page,
            limit,
            totalPages
        };
    }

    /**
     * Get action logs for a specific user
     */
    async getUserActionLogs(userId: number, filters: Omit<ActionLogFilters, 'userId'> = {}): Promise<ActionLogResponse> {
        return this.getActionLogs({ ...filters, userId });
    }

    /**
     * Get action logs by action type
     */
    async getActionLogsByType(action: string, filters: Omit<ActionLogFilters, 'action'> = {}): Promise<ActionLogResponse> {
        return this.getActionLogs({ ...filters, action });
    }

    /**
     * Get failed action logs (status code >= 400)
     */
    async getFailedActionLogs(filters: ActionLogFilters = {}): Promise<ActionLogResponse> {
        const queryBuilder = this.actionLogRepository
            .createQueryBuilder('log')
            .leftJoinAndSelect('log.user', 'user')
            .where('log.statusCode >= :statusCode', { statusCode: 400 })
            .orderBy('log.createdAt', 'DESC');

        this.applyFilters(queryBuilder, filters, ['statusCode']);

        const { page = 1, limit = 50 } = filters;
        const total = await queryBuilder.getCount();
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;

        const logs = await queryBuilder
            .skip(offset)
            .take(limit)
            .getMany();

        return {
            logs,
            total,
            page,
            limit,
            totalPages
        };
    }

    /**
     * Get action statistics
     */
    async getActionStatistics(filters: ActionLogFilters = {}): Promise<any> {
        const queryBuilder = this.actionLogRepository
            .createQueryBuilder('log');

        this.applyFilters(queryBuilder, filters);

        const [
            totalActions,
            successfulActions,
            failedActions,
            actionsByType,
            actionsByUser
        ] = await Promise.all([
            queryBuilder.getCount(),
            queryBuilder.clone().andWhere('log.statusCode < 400').getCount(),
            queryBuilder.clone().andWhere('log.statusCode >= 400').getCount(),
            queryBuilder.clone()
                .select('log.action', 'action')
                .addSelect('COUNT(*)', 'count')
                .groupBy('log.action')
                .orderBy('count', 'DESC')
                .limit(10)
                .getRawMany(),
            queryBuilder.clone()
                .leftJoin('log.user', 'user')
                .select('user.name', 'userName')
                .addSelect('user.email', 'userEmail')
                .addSelect('COUNT(*)', 'count')
                .where('log.userId IS NOT NULL')
                .groupBy('user.id, user.name, user.email')
                .orderBy('count', 'DESC')
                .limit(10)
                .getRawMany()
        ]);

        return {
            totalActions,
            successfulActions,
            failedActions,
            successRate: totalActions > 0 ? (successfulActions / totalActions * 100).toFixed(2) : 0,
            topActions: actionsByType,
            topUsers: actionsByUser
        };
    }

    /**
     * Delete old action logs (older than specified days)
     */
    async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const result = await this.actionLogRepository
            .createQueryBuilder()
            .delete()
            .where('createdAt < :cutoffDate', { cutoffDate })
            .execute();

        return result.affected || 0;
    }

    /**
     * Apply filters to query builder
     */
    private applyFilters(
        queryBuilder: SelectQueryBuilder<UserActionLog>, 
        filters: ActionLogFilters,
        excludeFields: string[] = []
    ): void {
        const {
            userId,
            action,
            resourceType,
            method,
            statusCode,
            ipAddress,
            startDate,
            endDate
        } = filters;

        if (userId && !excludeFields.includes('userId')) {
            queryBuilder.andWhere('log.userId = :userId', { userId });
        }

        if (action && !excludeFields.includes('action')) {
            queryBuilder.andWhere('log.action = :action', { action });
        }

        if (resourceType && !excludeFields.includes('resourceType')) {
            queryBuilder.andWhere('log.resourceType = :resourceType', { resourceType });
        }

        if (method && !excludeFields.includes('method')) {
            queryBuilder.andWhere('log.method = :method', { method });
        }

        if (statusCode && !excludeFields.includes('statusCode')) {
            queryBuilder.andWhere('log.statusCode = :statusCode', { statusCode });
        }

        if (ipAddress && !excludeFields.includes('ipAddress')) {
            queryBuilder.andWhere('log.ipAddress = :ipAddress', { ipAddress });
        }

        if (startDate && !excludeFields.includes('startDate')) {
            queryBuilder.andWhere('log.createdAt >= :startDate', { startDate });
        }

        if (endDate && !excludeFields.includes('endDate')) {
            queryBuilder.andWhere('log.createdAt <= :endDate', { endDate });
        }
    }
}
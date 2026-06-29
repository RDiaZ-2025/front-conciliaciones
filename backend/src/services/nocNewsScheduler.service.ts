import { Repository } from 'typeorm';
import { AppDataSource } from '../config/typeorm.config';
import { NocNewsScheduler } from '../models/NocNewsScheduler';

export interface CreateNewsScheduleDto {
    name: string;
    topic: string;
    userInstructions?: string | null;
    sources: string[];
    startAt: string;
    intervalMinutes: number;
    isActive?: boolean;
}

export interface UpdateNewsScheduleDto {
    name?: string;
    topic?: string;
    userInstructions?: string | null;
    sources?: string[];
    startAt?: string;
    intervalMinutes?: number;
    isActive?: boolean;
    status?: string;
}

export class NocNewsSchedulerService {
    private defaultWebhookUrl = 'https://n8n.srv865978.hstgr.cloud/webhook/noc/generate-news';

    private get repository(): Repository<NocNewsScheduler> {
        return AppDataSource.getRepository(NocNewsScheduler);
    }

    private minutesToCron(minutes: number): string {
        if (minutes === 15) return '*/15 * * * *';
        if (minutes === 30) return '*/30 * * * *';
        if (minutes === 60) return '0 * * * *';
        if (minutes === 120) return '0 */2 * * *';
        if (minutes === 360) return '0 */6 * * *';
        if (minutes === 720) return '0 */12 * * *';
        if (minutes === 1440) return '0 0 * * *';
        if (minutes === 2880) return '0 0 */2 * *';
        if (minutes === 10080) return '0 0 * * 0';
        return `*/${minutes} * * * *`;
    }

    private parseColombiaDate(dateStr: string): Date {
        if (!dateStr) return new Date();
        let normalized = dateStr.trim();
        if (!normalized.includes('Z') && !normalized.includes('+') && !/-\d{2}:\d{2}$/.test(normalized)) {
            normalized = normalized + '-05:00';
        }
        return new Date(normalized);
    }

    private calculateNextRun(startAtISO: string, intervalMinutes: number): Date {
        const startDate = this.parseColombiaDate(startAtISO);
        const start = startDate.getTime();
        const now = Date.now();
        if (isNaN(start)) {
            return new Date(now + intervalMinutes * 60000);
        }

        let next = start;
        while (next <= now) {
            next += intervalMinutes * 60000;
        }
        return new Date(next);
    }

    async getAllSchedules() {
        if (!AppDataSource.isInitialized) {
            return [];
        }
        const schedules = await this.repository.find({
            order: { createdAt: 'DESC' }
        });

        return schedules.map((item: NocNewsScheduler) => ({
            ...item,
            sources: JSON.parse(item.sources || '[]')
        }));
    }

    async getScheduleById(id: string) {
        if (!AppDataSource.isInitialized) {
            return null;
        }
        const schedule = await this.repository.findOne({ where: { id } });
        if (!schedule) return null;
        return {
            ...schedule,
            sources: JSON.parse(schedule.sources || '[]')
        };
    }

    async createSchedule(dto: CreateNewsScheduleDto) {
        if (!AppDataSource.isInitialized) {
            throw new Error('Database not initialized');
        }
        const id = 'sched-' + Date.now();
        const startAtDate = this.parseColombiaDate(dto.startAt);
        const nextRun = this.calculateNextRun(dto.startAt, dto.intervalMinutes);
        const cron = this.minutesToCron(dto.intervalMinutes);

        const newSchedule = this.repository.create({
            id,
            name: dto.name,
            topic: dto.topic,
            userInstructions: dto.userInstructions || null,
            sources: JSON.stringify(dto.sources || []),
            url: this.defaultWebhookUrl,
            method: 'POST',
            startAt: startAtDate,
            intervalMinutes: dto.intervalMinutes,
            cronExpression: cron,
            isActive: dto.isActive !== undefined ? dto.isActive : true,
            status: dto.isActive !== false ? 'Pending' : 'Cancelled',
            nextRunAt: nextRun
        });

        const saved = await this.repository.save(newSchedule);
        return {
            ...saved,
            sources: JSON.parse(saved.sources)
        };
    }

    async updateSchedule(id: string, dto: UpdateNewsScheduleDto) {
        if (!AppDataSource.isInitialized) {
            throw new Error('Database not initialized');
        }
        const schedule = await this.repository.findOne({ where: { id } });
        if (!schedule) return null;

        if (dto.name !== undefined) schedule.name = dto.name;
        if (dto.topic !== undefined) schedule.topic = dto.topic;
        if (dto.userInstructions !== undefined) schedule.userInstructions = dto.userInstructions;
        if (dto.sources !== undefined) schedule.sources = JSON.stringify(dto.sources);
        if (dto.isActive !== undefined) {
            schedule.isActive = dto.isActive;
            schedule.status = dto.isActive ? 'Pending' : 'Cancelled';
        }
        if (dto.status !== undefined) schedule.status = dto.status;

        if (dto.startAt !== undefined || dto.intervalMinutes !== undefined) {
            if (dto.startAt !== undefined) schedule.startAt = this.parseColombiaDate(dto.startAt);
            if (dto.intervalMinutes !== undefined) {
                schedule.intervalMinutes = dto.intervalMinutes;
                schedule.cronExpression = this.minutesToCron(dto.intervalMinutes);
            }
            const startAtStr = dto.startAt !== undefined ? dto.startAt : schedule.startAt.toISOString();
            schedule.nextRunAt = this.calculateNextRun(startAtStr, schedule.intervalMinutes);
        }

        const saved = await this.repository.save(schedule);
        return {
            ...saved,
            sources: JSON.parse(saved.sources)
        };
    }

    async toggleActive(id: string) {
        if (!AppDataSource.isInitialized) {
            throw new Error('Database not initialized');
        }
        const schedule = await this.repository.findOne({ where: { id } });
        if (!schedule) return null;

        schedule.isActive = !schedule.isActive;
        schedule.status = schedule.isActive ? 'Pending' : 'Cancelled';

        const saved = await this.repository.save(schedule);
        return {
            ...saved,
            sources: JSON.parse(saved.sources)
        };
    }

    async deleteSchedule(id: string) {
        if (!AppDataSource.isInitialized) {
            throw new Error('Database not initialized');
        }
        const result = await this.repository.delete({ id });
        return (result.affected || 0) > 0;
    }

    async recordExecution(id: string) {
        if (!AppDataSource.isInitialized) {
            throw new Error('Database not initialized');
        }
        const schedule = await this.repository.findOne({ where: { id } });
        if (!schedule) return null;

        const now = new Date();
        schedule.lastRunAt = now;
        schedule.nextRunAt = this.calculateNextRun(now.toISOString(), schedule.intervalMinutes);
        
        const saved = await this.repository.save(schedule);
        return {
            ...saved,
            sources: JSON.parse(saved.sources)
        };
    }
}

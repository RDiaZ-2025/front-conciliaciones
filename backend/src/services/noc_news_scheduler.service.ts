import { Repository } from 'typeorm';
import axios from 'axios';
import { AppDataSource } from '../config/typeorm.config';
import { NocNewsScheduler } from '../models/NocNewsScheduler';
import { NocNewsDraft } from '../models/NocNewsDraft';

export interface CreateNewsScheduleDto {
    name: string;
    topic: string;
    userInstructions?: string | null;
    sources: string[];
    startAt: string;
    scheduleConfig: any; // Raw JSON config from frontend
    isActive?: boolean;
    publishAutomatically?: boolean;
}

export interface UpdateNewsScheduleDto {
    name?: string;
    topic?: string;
    userInstructions?: string | null;
    sources?: string[];
    startAt?: string;
    scheduleConfig?: any; // Raw JSON config from frontend
    isActive?: boolean;
    status?: string;
    publishAutomatically?: boolean;
}

export class NocNewsSchedulerService {
    private defaultWebhookUrl = 'https://n8n.srv865978.hstgr.cloud/webhook/noc/generate-news';

    private get repository(): Repository<NocNewsScheduler> {
        return AppDataSource.getRepository(NocNewsScheduler);
    }

    private parseColombiaDate(dateStr: string): Date {
        if (!dateStr) return new Date();
        let normalized = dateStr.trim();
        if (!normalized.includes('Z') && !normalized.includes('+') && !/-\d{2}:\d{2}$/.test(normalized)) {
            normalized = normalized + '-05:00';
        }
        return new Date(normalized);
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

    // Simplified dynamic next run calculator using a unified JSON config
    private calculateNextRunFromConfig(config: any, startAtISO: string, fromDate: Date = new Date()): Date | null {
        const startDate = this.parseColombiaDate(startAtISO);
        const next = new Date(fromDate.getTime());
        next.setSeconds(0);
        next.setMilliseconds(0);

        if (!config) return null;

        // Check if global endAt boundary has already passed
        if (config.endAt) {
            const endDate = this.parseColombiaDate(config.endAt);
            if (fromDate > endDate) {
                return null; // Expiration reached
            }
        }

        // Case A: Interval-based execution
        if (config.intervalMinutes && config.intervalMinutes > 0) {
            const minutes = config.intervalMinutes;
            const start = startDate.getTime();
            const now = fromDate.getTime();
            
            let target = start;
            if (isNaN(start)) {
                target = now;
            }
            
            while (target <= now) {
                target += minutes * 60000;
            }

            const nextRun = new Date(target);
            
            // Loop until we hit a valid day of the week if day selection is active (fallback legacy support)
            if (config.daysOfWeek && config.daysOfWeek.length > 0) {
                while (!config.daysOfWeek.includes(nextRun.getDay())) {
                    nextRun.setDate(nextRun.getDate() + 1);
                }
            }

            if (config.endAt) {
                const endDate = this.parseColombiaDate(config.endAt);
                if (nextRun > endDate) {
                    return null; // Expiration boundary reached
                }
            }
            return nextRun;
        }

        // Case B: Specific Day/Time Rules execution (weeklyRules)
        const rules = config.weeklyRules && config.weeklyRules.length > 0 ? config.weeklyRules : [{ dayOfWeek: 1, time: "12:00" }];
        
        // Helper to format date in Colombia local timezone
        const getColombiaDateStr = (d: Date) => {
            const options: Intl.DateTimeFormatOptions = { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' };
            const formatter = new Intl.DateTimeFormat('en-US', options);
            const parts = formatter.formatToParts(d);
            const partVal = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)!.value;
            return `${partVal('year')}-${partVal('month')}-${partVal('day')}`;
        };

        const candidateDates = rules.map((rule: any) => {
            const dateStr = getColombiaDateStr(fromDate);
            const candidate = new Date(`${dateStr}T${rule.time}:00-05:00`);

            // Compute correct Colombia day of week
            const colDateObj = new Date(`${dateStr}T12:00:00-05:00`);
            const colDayOfWeek = colDateObj.getDay();

            let daysDiff = (rule.dayOfWeek - colDayOfWeek + 7) % 7;

            if (daysDiff === 0) {
                // If it is today, check if time has already passed
                if (candidate <= fromDate) {
                    daysDiff = 7; // Move to next week same day
                }
            }

            candidate.setDate(candidate.getDate() + daysDiff);
            return candidate;
        });

        candidateDates.sort((a: Date, b: Date) => a.getTime() - b.getTime());
        const nextRun = candidateDates[0];

        if (config.endAt) {
            const endDate = this.parseColombiaDate(config.endAt);
            if (nextRun > endDate) {
                return null;
            }
        }
        return nextRun;
    }

    async getAllSchedules() {
        if (!AppDataSource.isInitialized) {
            return [];
        }
        const schedules = await this.repository.find({
            order: { createdAt: 'DESC' }
        });

        const draftRepo = AppDataSource.getRepository(NocNewsDraft);
        const counts = await draftRepo.createQueryBuilder('draft')
            .select('draft.scheduleId', 'scheduleId')
            .addSelect('COUNT(draft.id)', 'count')
            .where('draft.status = :status', { status: 'pending' })
            .groupBy('draft.scheduleId')
            .getRawMany();

        const countMap = counts.reduce((acc, curr) => {
            acc[curr.scheduleId] = parseInt(curr.count, 10);
            return acc;
        }, {} as Record<string, number>);

        return schedules.map((item: NocNewsScheduler) => ({
            ...item,
            sources: JSON.parse(item.sources || '[]'),
            scheduleConfig: JSON.parse(item.scheduleConfig || '{}'),
            pendingDraftsCount: countMap[item.id] || 0
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
            sources: JSON.parse(schedule.sources || '[]'),
            scheduleConfig: JSON.parse(schedule.scheduleConfig || '{}')
        };
    }

    async createSchedule(dto: CreateNewsScheduleDto) {
        if (!AppDataSource.isInitialized) {
            throw new Error('Database not initialized');
        }
        const id = 'sched-' + Date.now();
        const startAtDate = this.parseColombiaDate(dto.startAt);
        const nextRun = this.calculateNextRunFromConfig(dto.scheduleConfig, dto.startAt);

        // Fallback backward compatibility for interval minutes
        let intervalMin = dto.scheduleConfig?.intervalMinutes || 1440;

        const newSchedule = this.repository.create({
            id,
            name: dto.name,
            topic: dto.topic,
            userInstructions: dto.userInstructions || null,
            sources: JSON.stringify(dto.sources || []),
            url: this.defaultWebhookUrl,
            method: 'POST',
            startAt: startAtDate,
            intervalMinutes: intervalMin,
            cronExpression: dto.scheduleConfig?.intervalMinutes ? this.minutesToCron(dto.scheduleConfig.intervalMinutes) : null,
            scheduleConfig: JSON.stringify(dto.scheduleConfig || {}),
            isActive: dto.isActive !== undefined ? dto.isActive : true,
            publishAutomatically: dto.publishAutomatically !== undefined ? dto.publishAutomatically : false,
            status: dto.isActive !== false ? (nextRun ? 'Pending' : 'Completed') : 'Cancelled',
            nextRunAt: nextRun
        });

        const saved = await this.repository.save(newSchedule);
        return {
            ...saved,
            sources: JSON.parse(saved.sources),
            scheduleConfig: JSON.parse(saved.scheduleConfig)
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
        if (dto.publishAutomatically !== undefined) {
            schedule.publishAutomatically = dto.publishAutomatically;
        }
        if (dto.status !== undefined) schedule.status = dto.status;

        if (dto.scheduleConfig !== undefined) {
            schedule.scheduleConfig = JSON.stringify(dto.scheduleConfig);
            if (dto.scheduleConfig.intervalMinutes) {
                schedule.intervalMinutes = dto.scheduleConfig.intervalMinutes;
                schedule.cronExpression = this.minutesToCron(dto.scheduleConfig.intervalMinutes);
            } else {
                schedule.intervalMinutes = 1440;
                schedule.cronExpression = null;
            }
        }

        if (dto.startAt !== undefined || dto.scheduleConfig !== undefined) {
            if (dto.startAt !== undefined) schedule.startAt = this.parseColombiaDate(dto.startAt);
            const startAtStr = dto.startAt !== undefined ? dto.startAt : schedule.startAt.toISOString();
            const configObj = dto.scheduleConfig !== undefined ? dto.scheduleConfig : JSON.parse(schedule.scheduleConfig);
            
            const nextRun = this.calculateNextRunFromConfig(configObj, startAtStr);
            schedule.nextRunAt = nextRun;
            if (schedule.isActive && !nextRun) {
                schedule.status = 'Completed';
            }
        }

        const saved = await this.repository.save(schedule);
        return {
            ...saved,
            sources: JSON.parse(saved.sources),
            scheduleConfig: JSON.parse(saved.scheduleConfig)
        };
    }

    async toggleActive(id: string) {
        if (!AppDataSource.isInitialized) {
            throw new Error('Database not initialized');
        }
        const schedule = await this.repository.findOne({ where: { id } });
        if (!schedule) return null;

        schedule.isActive = !schedule.isActive;
        if (schedule.isActive) {
            const configObj = JSON.parse(schedule.scheduleConfig);
            const nextRun = this.calculateNextRunFromConfig(configObj, schedule.startAt.toISOString());
            schedule.nextRunAt = nextRun;
            schedule.status = nextRun ? 'Pending' : 'Completed';
        } else {
            schedule.status = 'Cancelled';
        }

        const saved = await this.repository.save(schedule);
        return {
            ...saved,
            sources: JSON.parse(saved.sources),
            scheduleConfig: JSON.parse(saved.scheduleConfig)
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
        
        const configObj = JSON.parse(schedule.scheduleConfig);
        const nextRun = this.calculateNextRunFromConfig(configObj, schedule.startAt.toISOString(), now);
        schedule.nextRunAt = nextRun;
        if (!nextRun) {
            schedule.status = 'Completed';
        } else {
            schedule.status = 'Pending';
        }
        
        const saved = await this.repository.save(schedule);
        return {
            ...saved,
            sources: JSON.parse(saved.sources),
            scheduleConfig: JSON.parse(saved.scheduleConfig)
        };
    }

    async saveDraft(scheduleId: string, path: string) {
        if (!AppDataSource.isInitialized) {
            throw new Error('Database not initialized');
        }
        
        const schedule = await this.repository.findOne({ where: { id: scheduleId } });
        if (!schedule) {
            throw new Error(`Schedule with ID ${scheduleId} not found`);
        }

        const draftRepo = AppDataSource.getRepository(NocNewsDraft);
        const newDraft = draftRepo.create({
            scheduleId,
            path,
            status: 'pending'
        });

        return await draftRepo.save(newDraft);
    }

    async getDraftsByScheduleId(scheduleId: string) {
        if (!AppDataSource.isInitialized) {
            return [];
        }
        const draftRepo = AppDataSource.getRepository(NocNewsDraft);
        return await draftRepo.find({
            where: { scheduleId, status: 'pending' },
            order: { createdAt: 'DESC' }
        });
    }

    async getDraftById(id: number) {
        if (!AppDataSource.isInitialized) {
            return null;
        }
        const draftRepo = AppDataSource.getRepository(NocNewsDraft);
        return await draftRepo.findOne({ where: { id } });
    }

    async publishDraft(draftId: number) {
        if (!AppDataSource.isInitialized) {
            throw new Error('Database not initialized');
        }
        const draftRepo = AppDataSource.getRepository(NocNewsDraft);
        const draft = await draftRepo.findOne({ where: { id: draftId } });
        if (!draft) {
            throw new Error('Borrador no encontrado');
        }

        try {
            console.log(`[Publishing News Draft] Sending request to publish path: ${draft.path}`);
            await axios.post('https://n8n.srv865978.hstgr.cloud/webhook/noc/post-news', {
                data: {
                    path: draft.path
                },
                async: false
            });
        } catch (error: any) {
            console.error('Error in publish request:', error);
            throw new Error(`Error en el webhook de publicación: ${error.message}`);
        }

        draft.status = 'published';
        draft.publishedAt = new Date();
        return await draftRepo.save(draft);
    }

    async previewDraft(path: string) {
        try {
            const response = await axios.post('https://n8n.srv865978.hstgr.cloud/webhook/noc/prev-new', {
                data: { path },
                async: false
            });
            return response.data;
        } catch (error: any) {
            console.error('Error fetching preview from n8n webhook:', error);
            throw new Error(`Failed to fetch preview: ${error.message}`);
        }
    }
}

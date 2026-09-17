import { Repository } from 'typeorm';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import {
    BlobServiceClient,
    StorageSharedKeyCredential,
    generateBlobSASQueryParameters,
    BlobSASPermissions,
    SASProtocol
} from '@azure/storage-blob';
import { AppDataSource } from '../config/typeorm.config';
import { NocNewsScheduler } from '../models/NocNewsScheduler';
import { NocNewsDraft } from '../models/NocNewsDraft';
import { BluestacksCmsService } from './bluestacks_cms.service';
import { azureServiceBusSchedulerService } from './azure_service_bus_scheduler.service';

export interface NewsBlock {
    id: string;
    type: 'paragraph' | 'image' | 'heading';
    content?: string; // HTML or plain text for paragraph
    url?: string; // Image URL
    caption?: string; // Image caption
    alt?: string; // Image alt text
    prompt?: string; // Image AI prompt
    level?: number; // Heading level (2, 3)
    text?: string; // Heading text
}

export interface NewsArticleData {
    title: string;
    subtitle: string;
    coverImage?: {
        url: string;
        alt: string;
        caption: string;
        prompt?: string;
    };
    blocks: NewsBlock[];
    tags?: string[];
    section?: string;
    author?: string;
    sourcesUsed?: any[];
}

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
    // Microservicios Modulares de IA en n8n
    private get extractNewsUrl(): string | undefined {
        return process.env.N8N_AI_EXTRACT_NEWS_URL;
    }

    private get draftArticleUrl(): string | undefined {
        return process.env.N8N_AI_DRAFT_ARTICLE_URL;
    }

    private get generateImageUrl(): string | undefined {
        return process.env.N8N_AI_GENERATE_IMAGE_URL;
    }

    private get adjustParagraphUrl(): string | undefined {
        return process.env.N8N_AI_ADJUST_PARAGRAPH_URL;
    }

    private get regenerateImageUrl(): string | undefined {
        return process.env.N8N_AI_REGENERATE_IMAGE_URL;
    }

    private get adjustArticleUrl(): string | undefined {
        return process.env.N8N_AI_ADJUST_ARTICLE_URL;
    }

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
            url: this.extractNewsUrl || 'local_orchestrator',
            method: 'POST',
            startAt: startAtDate,
            intervalMinutes: intervalMin,
            cronExpression: dto.scheduleConfig?.intervalMinutes ? this.minutesToCron(dto.scheduleConfig.intervalMinutes) : null,
            scheduleConfig: JSON.stringify(dto.scheduleConfig || {}),
            isActive: dto.isActive !== undefined ? dto.isActive : true,
            publishAutomatically: dto.publishAutomatically !== undefined ? dto.publishAutomatically : false,
            status: dto.isActive !== false ? (nextRun ? 'Pending' : 'Completed') : 'Cancelled',
            nextRunAt: nextRun,
            serviceBusSequenceNumber: null
        });

        // Programar mensaje en Azure Service Bus si el agendamiento está activo
        if (newSchedule.isActive && newSchedule.nextRunAt) {
            newSchedule.serviceBusSequenceNumber = await azureServiceBusSchedulerService.scheduleExecution(newSchedule.id, newSchedule.nextRunAt);
        }

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

        // Reprogramar en Azure Service Bus si cambiaron fechas o estado activo
        if (dto.startAt !== undefined || dto.scheduleConfig !== undefined || dto.isActive !== undefined) {
            if (schedule.serviceBusSequenceNumber) {
                await azureServiceBusSchedulerService.cancelScheduledExecution(schedule.serviceBusSequenceNumber);
                schedule.serviceBusSequenceNumber = null;
            }

            if (schedule.isActive && schedule.nextRunAt) {
                schedule.serviceBusSequenceNumber = await azureServiceBusSchedulerService.scheduleExecution(schedule.id, schedule.nextRunAt);
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

            if (schedule.nextRunAt) {
                schedule.serviceBusSequenceNumber = await azureServiceBusSchedulerService.scheduleExecution(schedule.id, schedule.nextRunAt);
            }
        } else {
            schedule.status = 'Cancelled';
            if (schedule.serviceBusSequenceNumber) {
                await azureServiceBusSchedulerService.cancelScheduledExecution(schedule.serviceBusSequenceNumber);
                schedule.serviceBusSequenceNumber = null;
            }
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
        const schedule = await this.repository.findOne({ where: { id } });
        if (schedule?.serviceBusSequenceNumber) {
            await azureServiceBusSchedulerService.cancelScheduledExecution(schedule.serviceBusSequenceNumber);
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

    buildDefaultArticleData(topic: string, instructions?: string | null, sources?: string[]): NewsArticleData {
        const cleanTopic = topic || 'Noticia de Actualidad';
        const sampleImages = [
            'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80'
        ];
        const randomImg = sampleImages[Math.floor(Math.random() * sampleImages.length)];
        const secondaryImg = sampleImages[(Math.floor(Math.random() * sampleImages.length) + 1) % sampleImages.length];

        return {
            title: `Avances y Desarrollos Clave en ${cleanTopic}`,
            subtitle: `Análisis detallado sobre los acontecimientos más recientes relacionados con ${cleanTopic.toLowerCase()} y su impacto en el sector.`,
            coverImage: {
                url: randomImg,
                alt: `Cobertura informativa sobre ${cleanTopic}`,
                caption: `Fotografía ilustrativa generada por IA sobre ${cleanTopic}.`,
                prompt: `Fotografía periodística fotorrealista de alta definición representando ${cleanTopic}, iluminación profesional, enfoque editorial.`
            },
            blocks: [
                {
                    id: 'block-1',
                    type: 'paragraph',
                    content: `En las últimas horas se han registrado importantes novedades en el ámbito de <strong>${cleanTopic}</strong>. Diversos analistas y fuentes del sector destacan que las transformaciones recientes están marcando un nuevo estándar para la toma de decisiones estratégicas.`
                },
                {
                    id: 'block-2',
                    type: 'paragraph',
                    content: `De acuerdo con las fuentes consultadas${sources && sources.length > 0 ? ` (incluyendo ${sources[0]})` : ''}, la convergencia de nuevas tecnologías y normativas regulatorias ha impulsado una acelerada adopción de mejores prácticas.`
                },
                {
                    id: 'block-3',
                    type: 'image',
                    url: secondaryImg,
                    alt: `Perspectivas de ${cleanTopic}`,
                    caption: `Desarrollo de las actividades operativas y de campo vinculadas a ${cleanTopic}.`,
                    prompt: `Plano medio de profesionales analizando métricas y datos en pantallas en un entorno corporativo moderno.`
                },
                {
                    id: 'block-4',
                    type: 'paragraph',
                    content: `Los expertos concluyen que el seguimiento continuo a estas variables permitirá anticipar tendencias clave para los próximos meses, consolidando un panorama de crecimiento sostenido y eficiencia operativa.`
                }
            ],
            tags: [cleanTopic.toLowerCase(), 'actualidad', 'análisis', 'red+'],
            section: 'general',
            author: 'Redacción Red+'
        };
    }

    async saveDraft(scheduleId: string, pathOrData?: any): Promise<NocNewsDraft> {
        if (!AppDataSource.isInitialized) {
            throw new Error('Database not initialized');
        }
        
        const schedule = await this.repository.findOne({ where: { id: scheduleId } });
        if (!schedule) {
            throw new Error(`Schedule with ID ${scheduleId} not found`);
        }

        const draftRepo = AppDataSource.getRepository(NocNewsDraft);
        
        let articleData: NewsArticleData;
        let pathStr: string | null = null;

        if (typeof pathOrData === 'string' && pathOrData.startsWith('/')) {
            pathStr = pathOrData;
            articleData = this.buildDefaultArticleData(schedule.topic, schedule.userInstructions, JSON.parse(schedule.sources || '[]'));
        } else if (typeof pathOrData === 'object' && pathOrData !== null && pathOrData.title) {
            articleData = pathOrData as NewsArticleData;
        } else {
            articleData = this.buildDefaultArticleData(schedule.topic, schedule.userInstructions, JSON.parse(schedule.sources || '[]'));
        }

        const newDraft = draftRepo.create({
            scheduleId,
            title: articleData.title,
            subtitle: articleData.subtitle,
            content: JSON.stringify(articleData),
            path: pathStr,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date()
        });

        return await draftRepo.save(newDraft);
    }

    async getDraftsByScheduleId(scheduleId: string) {
        if (!AppDataSource.isInitialized) {
            return [];
        }
        const draftRepo = AppDataSource.getRepository(NocNewsDraft);
        const drafts = await draftRepo.find({
            where: { scheduleId },
            order: { createdAt: 'DESC' }
        });

        return drafts.map((d: NocNewsDraft) => {
            let parsedArticle: NewsArticleData | null = null;
            if (d.content) {
                try { parsedArticle = JSON.parse(d.content); } catch { parsedArticle = null; }
            }
            return {
                id: d.id,
                scheduleId: d.scheduleId,
                title: d.title || parsedArticle?.title || 'Noticia Sin Título',
                subtitle: d.subtitle || parsedArticle?.subtitle || '',
                path: d.path || '',
                status: d.status,
                createdAt: d.createdAt,
                updatedAt: d.updatedAt,
                publishedAt: d.publishedAt,
                coverImage: parsedArticle?.coverImage?.url || null
            };
        });
    }

    async getDraftById(id: number) {
        if (!AppDataSource.isInitialized) {
            return null;
        }
        const draftRepo = AppDataSource.getRepository(NocNewsDraft);
        const draft = await draftRepo.findOne({ where: { id } });
        if (!draft) return null;

        let articleData: NewsArticleData;
        if (draft.content) {
            try {
                articleData = JSON.parse(draft.content);
            } catch {
                articleData = this.buildDefaultArticleData(draft.title || 'Noticia');
            }
        } else {
            articleData = this.buildDefaultArticleData(draft.title || 'Noticia');
        }

        return {
            id: draft.id,
            scheduleId: draft.scheduleId,
            title: draft.title || articleData.title,
            subtitle: draft.subtitle || articleData.subtitle,
            path: draft.path,
            status: draft.status,
            createdAt: draft.createdAt,
            updatedAt: draft.updatedAt,
            publishedAt: draft.publishedAt,
            articleData
        };
    }

    async updateDraft(id: number, articleData: NewsArticleData) {
        if (!AppDataSource.isInitialized) {
            throw new Error('Database not initialized');
        }
        const draftRepo = AppDataSource.getRepository(NocNewsDraft);
        const draft = await draftRepo.findOne({ where: { id } });
        if (!draft) {
            throw new Error(`Borrador con ID ${id} no encontrado`);
        }

        draft.title = articleData.title || draft.title;
        draft.subtitle = articleData.subtitle || draft.subtitle;
        draft.content = JSON.stringify(articleData);
        draft.updatedAt = new Date();

        const saved = await draftRepo.save(draft);
        return {
            ...saved,
            articleData
        };
    }

    async deleteDraft(id: number): Promise<boolean> {
        if (!AppDataSource.isInitialized) {
            throw new Error('Database not initialized');
        }
        const draftRepo = AppDataSource.getRepository(NocNewsDraft);
        const draft = await draftRepo.findOne({ where: { id } });
        if (!draft) return false;

        // Solo permitir eliminar borradores que no hayan sido publicados
        if (draft.status === 'published') {
            throw new Error('No se pueden eliminar noticias que ya hayan sido publicadas');
        }

        const result = await draftRepo.delete({ id });
        return (result.affected || 0) > 0;
    }

    async aiAdjustParagraph(draftId: number, blockId: string, currentText: string, instruction: string) {
        const n8nAdjustParagraphUrl = this.adjustParagraphUrl;
        if (!n8nAdjustParagraphUrl) {
            throw new Error('La variable de entorno N8N_AI_ADJUST_PARAGRAPH_URL no está configurada en el servidor');
        }

        const payload = {
            environment: 'prod',
            async: false,
            data: {
                draftId,
                blockId,
                currentText,
                instruction
            }
        };

        try {
            console.log(`📡 [N8N Request][AI Adjust Paragraph] Sending to: ${n8nAdjustParagraphUrl}`);
            console.log(`📦 [N8N Payload][AI Adjust Paragraph]:`, JSON.stringify(payload, null, 2));
            const startTime = Date.now();
            const response = await axios.post(n8nAdjustParagraphUrl, payload, { 
                timeout: 45000,
                headers: this.getN8nHeaders()
            });
            const duration = Date.now() - startTime;
            console.log(`✅ [N8N Response][AI Adjust Paragraph] (${duration}ms) Status: ${response.status}`);
            console.log(`📥 [N8N Response Data][AI Adjust Paragraph]:`, JSON.stringify(response.data, null, 2));

            const result = response.data?.output || response.data;
            if (result && result.adjustedText) {
                return {
                    success: true,
                    blockId: result.blockId || blockId,
                    adjustedText: result.adjustedText,
                    plainText: result.plainText || result.adjustedText.replace(/<[^>]*>?/gm, '').trim(),
                    instructionApplied: result.instructionApplied || instruction,
                    timestamp: new Date().toISOString()
                };
            }
            throw new Error('La respuesta de n8n no devolvió el texto ajustado (adjustedText)');
        } catch (err: any) {
            console.error(`❌ [N8N Error][AI Adjust Paragraph] Webhook call to ${n8nAdjustParagraphUrl} failed:`, {
                message: err.message,
                status: err.response?.status,
                data: err.response?.data
            });
            throw new Error(`Error al ajustar párrafo con IA: ${err.response?.data?.message || err.message}`);
        }
    }

    async aiAdjustArticle(draftId: number, instruction: string, articleData: NewsArticleData) {
        const n8nAdjustArticleUrl = this.adjustArticleUrl;
        if (!n8nAdjustArticleUrl) {
            throw new Error('La variable de entorno N8N_AI_ADJUST_ARTICLE_URL no está configurada en el servidor');
        }

        const payload = {
            environment: 'prod',
            async: false,
            data: {
                draftId,
                instruction,
                articleData
            }
        };

        try {
            console.log(`📡 [N8N Request][AI Adjust Article] Sending to: ${n8nAdjustArticleUrl}`);
            console.log(`📦 [N8N Payload][AI Adjust Article]:`, JSON.stringify(payload, null, 2));
            const startTime = Date.now();
            const response = await axios.post(n8nAdjustArticleUrl, payload, { 
                timeout: 60000,
                headers: this.getN8nHeaders()
            });
            const duration = Date.now() - startTime;
            console.log(`✅ [N8N Response][AI Adjust Article] (${duration}ms) Status: ${response.status}`);
            console.log(`📥 [N8N Response Data][AI Adjust Article]:`, JSON.stringify(response.data, null, 2));

            const result = response.data?.output || response.data;
            if (result && result.adjustedArticle) {
                const finalArticle = result.adjustedArticle;
                if (draftId) {
                    await this.updateDraft(draftId, finalArticle);
                }
                return {
                    success: true,
                    adjustedArticle: finalArticle,
                    summary: result.summary || `Se aplicó la directriz "${instruction}" a todo el artículo.`,
                    timestamp: new Date().toISOString()
                };
            }
            throw new Error('La respuesta de n8n no devolvió el artículo ajustado (adjustedArticle)');
        } catch (err: any) {
            console.error(`❌ [N8N Error][AI Adjust Article] Webhook call to ${n8nAdjustArticleUrl} failed:`, {
                message: err.message,
                status: err.response?.status,
                data: err.response?.data
            });
            throw new Error(`Error al ajustar artículo con IA: ${err.response?.data?.message || err.message}`);
        }
    }

    async aiRegenerateImage(draftId: number, blockId: string, currentUrl: string, prompt: string, instruction: string) {
        const n8nRegenerateImageUrl = this.regenerateImageUrl;
        if (!n8nRegenerateImageUrl) {
            throw new Error('La variable de entorno N8N_AI_REGENERATE_IMAGE_URL no está configurada en el servidor');
        }

        const payload = {
            environment: 'prod',
            async: false,
            data: {
                draftId,
                blockId,
                currentUrl,
                prompt,
                instruction
            }
        };

        try {
            console.log(`📡 [N8N Request][AI Regenerate Image] Sending to: ${n8nRegenerateImageUrl}`);
            console.log(`📦 [N8N Payload][AI Regenerate Image]:`, JSON.stringify(payload, null, 2));
            const startTime = Date.now();
            const response = await axios.post(n8nRegenerateImageUrl, payload, { 
                timeout: 120000,
                headers: this.getN8nHeaders()
            });
            const duration = Date.now() - startTime;
            console.log(`✅ [N8N Response][AI Regenerate Image] (${duration}ms) Status: ${response.status}`);
            console.log(`📥 [N8N Response Data][AI Regenerate Image]:`, JSON.stringify(response.data, null, 2));

            const result = response.data?.output || response.data;
            if (result && (result.newUrl || result.imageUrl || result.url)) {
                const tempUrl = result.newUrl || result.imageUrl || result.url;
                // Persistir permanentemente la imagen en Azure Blob Storage
                const persistentUrl = await this.persistImage(tempUrl, 'noc-news-regen');
                return {
                    success: true,
                    blockId: result.blockId || blockId,
                    newUrl: persistentUrl,
                    prompt: result.prompt || result.newPrompt || prompt,
                    caption: result.caption || `Imagen adaptada por IA según la directriz: "${instruction}".`,
                    timestamp: new Date().toISOString()
                };
            }
            throw new Error('La respuesta de n8n no devolvió una URL válida de imagen (newUrl/imageUrl)');
        } catch (err: any) {
            console.error(`❌ [N8N Error][AI Regenerate Image] Webhook call to ${n8nRegenerateImageUrl} failed:`, {
                message: err.message,
                status: err.response?.status,
                data: err.response?.data
            });
            throw new Error(`Error al regenerar imagen con IA: ${err.response?.data?.message || err.message}`);
        }
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

        let articleData: NewsArticleData;
        try {
            articleData = draft.content ? JSON.parse(draft.content) : this.buildDefaultArticleData(draft.title || 'Noticia');
        } catch {
            articleData = this.buildDefaultArticleData(draft.title || 'Noticia');
        }

        let cmsPath = draft.path;
        try {
            const bluestacksCms = new BluestacksCmsService();
            // 1. Si no tiene path en CMS aún, crear el borrador en Bluestacks
            if (!cmsPath) {
                const createRes = await bluestacksCms.createNewsDraft(articleData);
                cmsPath = createRes.cmsPath;
            }

            // 2. Publicar la noticia en el CMS Bluestacks
            if (cmsPath) {
                await bluestacksCms.publishNews(cmsPath);
            }
        } catch (cmsErr: any) {
            console.warn(`[Publish Draft] Bluestacks CMS publication warning:`, cmsErr.message);
        }

        draft.path = cmsPath || draft.path;
        draft.status = 'published';
        draft.publishedAt = new Date();
        draft.updatedAt = new Date();
        return await draftRepo.save(draft);
    }

    async previewDraft(path: string) {
        return { success: true, message: 'Preview is now handled locally by structured draft editor' };
    }

    // --- Pipeline Modular de Inteligencia Artificial (Microservicios) ---

    private getN8nHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };
        const secret = process.env.N8N_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET;
        if (secret) {
            headers['X-Webhook-Secret'] = secret;
        }
        return headers;
    }

    private async step1_extractNews(topic: string, userInstructions: string | null, sources: string[]): Promise<any> {
        if (!this.extractNewsUrl) {
            throw new Error('La variable de entorno N8N_AI_EXTRACT_NEWS_URL no está configurada en el servidor');
        }

        const payload = {
            environment: 'prod',
            async: false,
            data: {
                topic,
                userInstructions,
                sources
            }
        };
        try {
            console.log(`📡 [N8N Request][Pipeline Step 1 - Extract News] Sending to: ${this.extractNewsUrl}`);
            console.log(`📦 [N8N Payload][Pipeline Step 1]:`, JSON.stringify(payload, null, 2));
            const startTime = Date.now();
            const response = await axios.post(this.extractNewsUrl, payload, { 
                timeout: 180000,
                headers: this.getN8nHeaders()
            });
            const duration = Date.now() - startTime;
            console.log(`✅ [N8N Response][Pipeline Step 1] (${duration}ms) Status: ${response.status}`);
            console.log(`📥 [N8N Response Data][Pipeline Step 1]:`, JSON.stringify(response.data, null, 2));

            const result = response.data?.output || response.data;
            if (result && (result.rawFacts || result.keyContext)) {
                return result;
            }
            throw new Error('La respuesta de n8n no contiene la estructura esperada (rawFacts/keyContext)');
        } catch (err: any) {
            console.error(`❌ [N8N Error][Pipeline Step 1 - Extract News] Webhook call failed:`, {
                message: err.message,
                status: err.response?.status,
                data: err.response?.data
            });
            throw new Error(`Error en el Paso 1 (Extracción de Noticias con IA): ${err.response?.data?.message || err.message}`);
        }
    }

    private async step2_draftArticle(topic: string, userInstructions: string | null, extractedData: any): Promise<any> {
        if (!this.draftArticleUrl) {
            throw new Error('La variable de entorno N8N_AI_DRAFT_ARTICLE_URL no está configurada en el servidor');
        }

        const payload = {
            environment: 'prod',
            async: false,
            data: {
                topic: extractedData.topic || topic,
                keyContext: extractedData.keyContext || '',
                rawFacts: extractedData.rawFacts || [],
                sourcesFound: extractedData.sourcesFound || [],
                userInstructions
            }
        };
        try {
            console.log(`📡 [N8N Request][Pipeline Step 2 - Draft Article] Sending to: ${this.draftArticleUrl}`);
            console.log(`📦 [N8N Payload][Pipeline Step 2]:`, JSON.stringify(payload, null, 2));
            const startTime = Date.now();
            const response = await axios.post(this.draftArticleUrl, payload, { 
                timeout: 180000,
                headers: this.getN8nHeaders()
            });
            const duration = Date.now() - startTime;
            console.log(`✅ [N8N Response][Pipeline Step 2] (${duration}ms) Status: ${response.status}`);
            console.log(`📥 [N8N Response Data][Pipeline Step 2]:`, JSON.stringify(response.data, null, 2));

            const result = response.data?.output || response.data;
            if (result && result.title && (result.blocks || result.paragraphs)) {
                return result;
            }
            throw new Error('La respuesta de n8n no contiene la estructura esperada del artículo (title/blocks)');
        } catch (err: any) {
            console.error('❌ [AI Pipeline] Error en paso 2 (Periodista IA):', {
                message: err.message,
                status: err.response?.status,
                data: err.response?.data
            });
            throw new Error(`Error en el Paso 2 (Redacción Periodística con IA): ${err.response?.data?.message || err.message}`);
        }
    }

    private isSafeImageUrl(urlStr: string): boolean {
        try {
            const parsed = new URL(urlStr);
            if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
                return false;
            }

            const hostname = parsed.hostname.toLowerCase();

            // Bloquear localhost, loopback y cero
            if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '0.0.0.0') {
                return false;
            }

            // Bloquear servicio de metadatos de la nube (169.254.169.254) y link-local
            if (hostname.startsWith('169.254.') || hostname.endsWith('.internal') || hostname.endsWith('.local')) {
                return false;
            }

            // Bloquear rangos de IP privadas (RFC 1918)
            if (hostname.startsWith('10.') || hostname.startsWith('192.168.')) {
                return false;
            }
            if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)) {
                return false;
            }

            return true;
        } catch {
            return false;
        }
    }

    async persistImage(imageUrl: string, prefix: string = 'noc-news'): Promise<string> {
        if (!imageUrl || !imageUrl.startsWith('http')) {
            return imageUrl;
        }

        // Si ya es una URL permanente de Azure Blob Storage o de nuestro propio servidor, no es necesario volver a subirla
        if (imageUrl.includes('.blob.core.windows.net') || imageUrl.startsWith('/uploads/')) {
            return imageUrl;
        }

        // Protección anti-SSRF
        if (!this.isSafeImageUrl(imageUrl)) {
            console.warn(`⚠️ [Security Alert] Rechazada URL sospechosa de SSRF en persistImage: ${imageUrl}`);
            return imageUrl;
        }

        try {
            console.log(`📥 [Storage Persistence] Downloading image from: ${imageUrl.substring(0, 80)}...`);
            const response = await axios.get(imageUrl, {
                responseType: 'arraybuffer',
                timeout: 45000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                },
                maxContentLength: 20 * 1024 * 1024 // Limitar a 20MB máximo
            });

            const buffer = Buffer.from(response.data);
            const fileName = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.jpg`;

            // Intentar subir a Azure Blob Storage
            const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || 'vocprojectstorage';
            const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
            const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'public';

            if (accountName && accountKey) {
                try {
                    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
                    const blobServiceClient = new BlobServiceClient(
                        `https://${accountName}.blob.core.windows.net`,
                        sharedKeyCredential
                    );
                    const containerClient = blobServiceClient.getContainerClient(containerName);
                    
                    await containerClient.createIfNotExists({ access: 'blob' });

                    const blobPath = `noc-news/${fileName}`;
                    const blockBlobClient = containerClient.getBlockBlobClient(blobPath);

                    await blockBlobClient.uploadData(buffer, {
                        blobHTTPHeaders: {
                            blobContentType: 'image/jpeg',
                            blobCacheControl: 'public, max-age=31536000'
                        }
                    });

                    // Generar SAS de larga duración (5 años) para asegurar acceso ininterrumpido
                    const startDate = new Date();
                    startDate.setMinutes(startDate.getMinutes() - 15);
                    const expiryDate = new Date();
                    expiryDate.setFullYear(expiryDate.getFullYear() + 5);

                    const sasOptions = {
                        containerName,
                        blobName: blobPath,
                        permissions: BlobSASPermissions.parse("r"),
                        startsOn: startDate,
                        expiresOn: expiryDate,
                        protocol: SASProtocol.Https
                    };

                    const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();
                    const permanentUrl = `${blockBlobClient.url}?${sasToken}`;
                    console.log(`☁️ [Storage Persistence] Image successfully saved in Azure Blob Storage: ${blockBlobClient.url}`);
                    return permanentUrl;
                } catch (azureErr: any) {
                    console.warn(`⚠️ [Storage Persistence] Azure upload warning (${azureErr.message}), saving to local storage fallback`);
                }
            }

            // Fallback a almacenamiento local en disco
            const uploadsDir = path.join(process.cwd(), 'uploads', 'noc-news');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }
            const localFilePath = path.join(uploadsDir, fileName);
            fs.writeFileSync(localFilePath, buffer);
            console.log(`💾 [Storage Persistence] Image saved locally to ${localFilePath}`);
            return `/uploads/noc-news/${fileName}`;
        } catch (err: any) {
            console.error(`❌ [Storage Persistence] Error downloading/persisting image:`, err.message);
            return imageUrl;
        }
    }

    private async step3_generateImage(prompt: string, contextTopic: string): Promise<string> {
        if (!this.generateImageUrl) {
            throw new Error('La variable de entorno N8N_AI_GENERATE_IMAGE_URL no está configurada en el servidor');
        }

        const payload = {
            environment: 'prod',
            async: false,
            data: {
                prompt,
                context: contextTopic
            }
        };
        try {
            console.log(`📡 [N8N Request][Pipeline Step 3 - Generate Image] Sending to: ${this.generateImageUrl}`);
            console.log(`📦 [N8N Payload][Pipeline Step 3]:`, JSON.stringify(payload, null, 2));
            const startTime = Date.now();
            const response = await axios.post(this.generateImageUrl, payload, { 
                timeout: 120000,
                headers: this.getN8nHeaders()
            });
            const duration = Date.now() - startTime;
            console.log(`✅ [N8N Response][Pipeline Step 3] (${duration}ms) Status: ${response.status}`);
            console.log(`📥 [N8N Response Data][Pipeline Step 3]:`, JSON.stringify(response.data, null, 2));

            const result = response.data?.output || response.data;
            if (result && (result.imageUrl || result.url)) {
                const tempUrl = result.imageUrl || result.url;
                // Persistir permanentemente la imagen en Azure Blob Storage
                const persistentUrl = await this.persistImage(tempUrl, 'noc-news');
                return persistentUrl;
            }
            throw new Error('La respuesta de n8n no devolvió una URL válida de imagen (imageUrl/url)');
        } catch (err: any) {
            console.error(`❌ [N8N Error][Pipeline Step 3 - Generate Image] Webhook call failed:`, {
                message: err.message,
                status: err.response?.status,
                data: err.response?.data
            });
            throw new Error(`Error en el Paso 3 (Generación de Imagen con IA): ${err.response?.data?.message || err.message}`);
        }
    }

    async executeSchedule(id: string) {
        if (!AppDataSource.isInitialized) {
            throw new Error('Database not initialized');
        }
        const schedule = await this.repository.findOne({ where: { id } });
        if (!schedule) {
            throw new Error(`Agendamiento con ID ${id} no encontrado`);
        }

        const sources = schedule.sources ? (typeof schedule.sources === 'string' ? JSON.parse(schedule.sources) : schedule.sources) : [];

        const startTime = Date.now();
        console.log(`🚀 [Pipeline Orchestrator] Starting news generation for Schedule ID: "${id}" | Name: "${schedule.name}" | Topic: "${schedule.topic}"`);

        // --- PASO 1: Ingesta y Extracción de Hechos Clave con IA ---
        const extractedData = await this.step1_extractNews(
            schedule.topic,
            schedule.userInstructions,
            Array.isArray(sources) ? sources : []
        );
        console.log(`📋 [Pipeline Step 1 Done] Facts extracted: ${extractedData.rawFacts?.length || 0} | Context length: ${extractedData.keyContext?.length || 0} chars`);

        // --- PASO 2: Redacción Periodística y Planificación de Imágenes con IA ---
        const draftedContent = await this.step2_draftArticle(
            schedule.topic,
            schedule.userInstructions,
            extractedData
        );
        console.log(`✍️ [Pipeline Step 2 Done] Article drafted: "${draftedContent.title}" | Proposed blocks: ${draftedContent.blocks?.length || 0}`);

        // --- PASO 3: Generación de Imagen de Portada con IA ---
        console.log(`🎨 [Pipeline Step 3 Starting] Generating cover image with prompt: "${draftedContent.coverImagePrompt}"`);
        const coverImageUrl = await this.step3_generateImage(
            draftedContent.coverImagePrompt || `Photojournalism of ${schedule.topic}`,
            schedule.topic
        );
        console.log(`🖼️ [Pipeline Step 3 Cover Done] Cover URL: ${coverImageUrl}`);

        // --- PASO 4: Ensamblado y Generación de Bloques con Imágenes Intermedias ---
        const blocks: NewsBlock[] = [];
        let blockIndex = 1;

        if (draftedContent.blocks && Array.isArray(draftedContent.blocks)) {
            for (const b of draftedContent.blocks) {
                if (b.type === 'image') {
                    const imgPrompt = b.content || b.prompt || `Photojournalism illustrating ${schedule.topic}`;
                    console.log(`🎨 [Pipeline Block Image] Generating in-article image #${blockIndex} with prompt: "${imgPrompt}"`);
                    const imgUrl = await this.step3_generateImage(imgPrompt, schedule.topic);
                    blocks.push({
                        id: `block-${blockIndex++}`,
                        type: 'image',
                        url: imgUrl,
                        prompt: imgPrompt,
                        caption: b.caption || `Fotografía ilustrativa generada con IA.`,
                        alt: `Ilustración periodística para ${draftedContent.title}`
                    });
                } else {
                    blocks.push({
                        id: `block-${blockIndex++}`,
                        type: 'paragraph',
                        content: b.content || b.text || ''
                    });
                }
            }
        } else if (draftedContent.paragraphs && Array.isArray(draftedContent.paragraphs)) {
            draftedContent.paragraphs.forEach((p: any) => {
                blocks.push({
                    id: `block-${blockIndex++}`,
                    type: 'paragraph',
                    content: p.text || p.content || p
                });
            });
        }

        const createdArticleData: NewsArticleData = {
            title: draftedContent.title || `Noticia: ${schedule.topic}`,
            subtitle: draftedContent.subtitle || '',
            coverImage: {
                url: coverImageUrl,
                alt: `Portada de ${schedule.topic}`,
                caption: draftedContent.coverImageCaption || `Fotografía de portada generada con IA.`,
                prompt: draftedContent.coverImagePrompt
            },
            blocks,
            tags: draftedContent.tags || [schedule.topic.toLowerCase(), draftedContent.category?.toLowerCase() || 'actualidad'],
            section: draftedContent.category?.toLowerCase() || 'general',
            author: 'Redacción Red+',
            sourcesUsed: extractedData.sourcesFound || extractedData.sourcesUsed || sources
        };

        // Actualizar la fecha de última y próxima ejecución
        const now = new Date();
        schedule.lastRunAt = now;
        const configObj = typeof schedule.scheduleConfig === 'string' ? JSON.parse(schedule.scheduleConfig || '{}') : (schedule.scheduleConfig || {});
        const nextRun = this.calculateNextRunFromConfig(configObj, schedule.startAt.toISOString(), now);
        schedule.nextRunAt = nextRun;
        schedule.status = nextRun ? 'Pending' : 'Completed';

        // Cancelar mensaje anterior si existía y programar la siguiente repetición en Azure Service Bus
        if (schedule.serviceBusSequenceNumber) {
            await azureServiceBusSchedulerService.cancelScheduledExecution(schedule.serviceBusSequenceNumber);
            schedule.serviceBusSequenceNumber = null;
        }
        if (nextRun && schedule.isActive) {
            schedule.serviceBusSequenceNumber = await azureServiceBusSchedulerService.scheduleExecution(schedule.id, nextRun);
        }

        const updatedSchedule = await this.repository.save(schedule);

        // Guardar el borrador estructurado en nuestra BD local
        const draftRepo = AppDataSource.getRepository(NocNewsDraft);
        const newDraft = draftRepo.create({
            scheduleId: schedule.id,
            title: createdArticleData.title,
            subtitle: createdArticleData.subtitle,
            content: JSON.stringify(createdArticleData),
            path: null,
            status: schedule.publishAutomatically ? 'published' : 'pending',
            createdAt: now,
            updatedAt: now,
            publishedAt: schedule.publishAutomatically ? now : null
        });
        const savedDraft = await draftRepo.save(newDraft);

        const totalDurationSec = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`✅ [Pipeline Completed] Draft ID: ${savedDraft.id} | Total Time: ${totalDurationSec}s | Next Run: ${nextRun ? nextRun.toISOString() : 'None'}`);

        // Si tenía autopublicar activado, publicar de inmediato
        if (schedule.publishAutomatically) {
            console.log(`🌐 [Auto-Publish] Auto-publishing draft ID: ${savedDraft.id} to Bluestacks CMS...`);
            await this.publishDraft(savedDraft.id);
        }

        return {
            schedule: {
                ...updatedSchedule,
                sources: JSON.parse(updatedSchedule.sources || '[]'),
                scheduleConfig: JSON.parse(updatedSchedule.scheduleConfig || '{}')
            },
            draft: savedDraft,
            articleData: createdArticleData
        };
    }
}

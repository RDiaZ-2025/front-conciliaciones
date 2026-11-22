import { Not, Repository } from 'typeorm';
import axios from 'axios';
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
    content?: string;
    url?: string;
    caption?: string;
    alt?: string;
    prompt?: string;
    level?: number;
    text?: string;
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
    cmsPath?: string;
}

export interface CreateNewsScheduleDto {
    name: string;
    topic: string;
    userInstructions?: string | null;
    sources: string[];
    startAt: string;
    scheduleConfig: any;
    isActive?: boolean;
    publishAutomatically?: boolean;
}

export interface UpdateNewsScheduleDto {
    name?: string;
    topic?: string;
    userInstructions?: string | null;
    sources?: string[];
    startAt?: string;
    scheduleConfig?: any;
    isActive?: boolean;
    status?: string;
    publishAutomatically?: boolean;
}

export class NocNewsSchedulerService {

    private static readonly AZEMBLIA_AUTOMATIONS = {
        newsResearch: '/Automations/news-research/executions',
        newsDraft: '/Automations/news-draft/executions',
        newsImage: '/Automations/news-image/executions',
        newsAdjustParagraph: '/Automations/news-adjust-paragraph/executions',
        newsRegenerateImage: '/Automations/news-regenerate-image/executions',
        newsAdjustArticle: '/Automations/news-adjust-article/executions'
    } as const;

    private get azembliaApiUrl(): string {
        const url = process.env.AZEMBLIA_API_URL?.trim().replace(/\/+$/, '');
        if (!url) {
            throw new Error('La variable de entorno AZEMBLIA_API_URL es requerida y no está configurada.');
        }
        return url;
    }

    private get azembliaApiKey(): string {
        const apiKey = process.env.AZEMBLIA_API_KEY?.trim();
        if (!apiKey) {
            throw new Error('La variable de entorno AZEMBLIA_API_KEY es requerida y no está configurada.');
        }
        return apiKey;
    }

    private get azembliaCompanyId(): string {
        const companyId = process.env.AZEMBLIA_COMPANY_ID?.trim();
        if (!companyId) {
            throw new Error('La variable de entorno AZEMBLIA_COMPANY_ID es requerida y no está configurada.');
        }
        return companyId;
    }

    private buildAzembliaUrl(endpointPath: string, reference?: string): string {
        const url = new URL(`${this.azembliaApiUrl}${endpointPath}`);
        url.searchParams.set('companyId', this.azembliaCompanyId);
        if (reference && reference.trim()) {
            url.searchParams.set('reference', reference.trim().slice(0, 256));
        }
        return url.toString();
    }

    private formatDraftReference(draftId?: number | null): string | undefined {
        if (!draftId) return undefined;
        return `borrador-${draftId}`.slice(0, 256);
    }

    private getAzembliaHeaders(): Record<string, string> {
        return {
            'Content-Type': 'application/json',
            'x-api-key': this.azembliaApiKey
        };
    }

    private async callAzembliaAutomation(
        endpointPath: string,
        payload: any,
        timeoutMs: number,
        stepLabel: string,
        reference?: string
    ): Promise<any> {
        const requestUrl = this.buildAzembliaUrl(endpointPath, reference);
        const headers = this.getAzembliaHeaders();

        try {
            console.log(`📡 [Azemblia API][${stepLabel}] POST ${requestUrl}`);
            console.log(`📦 [Azemblia Payload][${stepLabel}]:`, JSON.stringify(payload, null, 2));
            const startTime = Date.now();
            const response = await axios.post(requestUrl, payload, {
                timeout: timeoutMs,
                headers
            });
            const duration = Date.now() - startTime;
            console.log(`✅ [Azemblia Response][${stepLabel}] (${duration}ms) Status: ${response.status}`);
            console.log(`📥 [Azemblia Response Data][${stepLabel}]:`, JSON.stringify(response.data, null, 2));

            return response.data?.output || response.data;
        } catch (err: any) {
            const status: number | undefined = err.response?.status;
            const respData = err.response?.data;
            const rawDetail =
                typeof respData === 'string'
                    ? respData
                    : respData?.message || respData?.error || respData?.detail || err.message;

            console.error(`❌ [Azemblia Error][${stepLabel}] POST ${requestUrl} failed:`, {
                message: err.message,
                status,
                data: respData
            });

            let errorMessage: string;
            let statusCode = 500;

            if (status === 400) {
                statusCode = 400;
                const fullText = `${rawDetail || ''} ${typeof respData === 'object' ? JSON.stringify(respData) : ''}`.toLowerCase();
                if (fullText.includes('insufficient balance')) {
                    errorMessage = `${stepLabel}: Saldo insuficiente en Azemblia para ejecutar la generación con IA (no se realizó ningún cobro).`;
                } else {
                    errorMessage = `${stepLabel}: Solicitud inválida en Azemblia (400): ${rawDetail}`;
                }
            } else if (status === 401) {
                statusCode = 401;
                errorMessage = `${stepLabel}: Error de autenticación con la API de Azemblia (401). Verifique AZEMBLIA_API_KEY en el servidor.`;
            } else if (status === 403) {
                statusCode = 403;
                errorMessage = `${stepLabel}: Esta automatización no está habilitada para la cuenta configurada en Azemblia (403).`;
            } else if (status && status >= 500) {
                statusCode = 502;
                errorMessage = `${stepLabel}: Error temporal en el servidor de Azemblia (${status}). No se realizó cobro; puede reintentar.`;
            } else {
                errorMessage = `${stepLabel}: ${rawDetail}`;
            }

            const wrappedError: any = new Error(errorMessage);
            wrappedError.statusCode = statusCode;
            throw wrappedError;
        }
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

    private calculateNextRunFromConfig(config: any, startAtISO: string, fromDate: Date = new Date()): Date | null {
        const startDate = this.parseColombiaDate(startAtISO);
        const next = new Date(fromDate.getTime());
        next.setSeconds(0);
        next.setMilliseconds(0);

        if (!config) return null;

        if (config.endAt) {
            const endDate = this.parseColombiaDate(config.endAt);
            if (fromDate > endDate) {
                return null;
            }
        }

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

            if (config.daysOfWeek && config.daysOfWeek.length > 0) {
                while (!config.daysOfWeek.includes(nextRun.getDay())) {
                    nextRun.setDate(nextRun.getDate() + 1);
                }
            }

            if (config.endAt) {
                const endDate = this.parseColombiaDate(config.endAt);
                if (nextRun > endDate) {
                    return null;
                }
            }
            return nextRun;
        }

        const rules = config.weeklyRules && config.weeklyRules.length > 0 ? config.weeklyRules : [{ dayOfWeek: 1, time: "12:00" }];

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

            const colDateObj = new Date(`${dateStr}T12:00:00-05:00`);
            const colDayOfWeek = colDateObj.getDay();

            let daysDiff = (rule.dayOfWeek - colDayOfWeek + 7) % 7;

            if (daysDiff === 0) {

                if (candidate <= fromDate) {
                    daysDiff = 7;
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

        let intervalMin = dto.scheduleConfig?.intervalMinutes || 1440;

        const newSchedule = this.repository.create({
            id,
            name: dto.name,
            topic: dto.topic,
            userInstructions: dto.userInstructions || null,
            sources: JSON.stringify(dto.sources || []),
            url: `${this.azembliaApiUrl}${NocNewsSchedulerService.AZEMBLIA_AUTOMATIONS.newsResearch}`,
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
            where: { scheduleId, status: Not('generating') },
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
                url: d.path || '',
                status: d.status,
                createdAt: d.createdAt,
                updatedAt: d.updatedAt,
                publishedAt: d.publishedAt,
                coverImage: parsedArticle?.coverImage?.url || null,
                cmsPath: parsedArticle?.cmsPath || null
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
            url: draft.path,
            status: draft.status,
            createdAt: draft.createdAt,
            updatedAt: draft.updatedAt,
            publishedAt: draft.publishedAt,
            cmsPath: articleData.cmsPath || null,
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

        if (draft.content && !articleData.cmsPath) {
            try {
                const existing = JSON.parse(draft.content);
                if (existing?.cmsPath) {
                    articleData.cmsPath = existing.cmsPath;
                }
            } catch {}
        }

        draft.title = articleData.title || draft.title;
        draft.subtitle = articleData.subtitle || draft.subtitle;
        draft.content = JSON.stringify(articleData);
        draft.updatedAt = new Date();

        const saved = await draftRepo.save(draft);
        return {
            ...saved,
            cmsPath: articleData.cmsPath || null,
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

        if (draft.status === 'published') {
            throw new Error('No se pueden eliminar noticias que ya hayan sido publicadas');
        }

        const result = await draftRepo.delete({ id });
        return (result.affected || 0) > 0;
    }

    async aiAdjustParagraph(draftId: number, blockId: string, currentText: string, instruction: string) {
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

        const result = await this.callAzembliaAutomation(
            NocNewsSchedulerService.AZEMBLIA_AUTOMATIONS.newsAdjustParagraph,
            payload,
            45000,
            'Ajuste de Párrafo con IA',
            this.formatDraftReference(draftId)
        );

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
        throw new Error('La respuesta de Azemblia no devolvió el texto ajustado (adjustedText)');
    }

    async aiAdjustArticle(draftId: number, instruction: string, articleData: NewsArticleData) {
        const payload = {
            environment: 'prod',
            async: false,
            data: {
                draftId,
                instruction,
                articleData
            }
        };

        const result = await this.callAzembliaAutomation(
            NocNewsSchedulerService.AZEMBLIA_AUTOMATIONS.newsAdjustArticle,
            payload,
            60000,
            'Ajuste de Artículo con IA',
            this.formatDraftReference(draftId)
        );

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
        throw new Error('La respuesta de Azemblia no devolvió el artículo ajustado (adjustedArticle)');
    }

    async aiRegenerateImage(draftId: number, blockId: string, currentUrl: string, prompt: string, instruction: string) {
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

        const result = await this.callAzembliaAutomation(
            NocNewsSchedulerService.AZEMBLIA_AUTOMATIONS.newsRegenerateImage,
            payload,
            120000,
            'Regeneración de Imagen con IA',
            this.formatDraftReference(draftId)
        );

        if (result && (result.newUrl || result.imageUrl || result.url)) {
            const tempUrl = result.newUrl || result.imageUrl || result.url;

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
        throw new Error('La respuesta de Azemblia no devolvió una URL válida de imagen (newUrl/imageUrl)');
    }

    async publishDraftToCmsOnly(draftId: number) {
        console.log(`📝 [Publish Draft to CMS Only] Iniciando creación de borrador en Bluestacks CMS para ID: ${draftId}`);

        if (!AppDataSource.isInitialized) {
            throw new Error('Database not initialized');
        }
        const draftRepo = AppDataSource.getRepository(NocNewsDraft);
        const draft = await draftRepo.findOne({ where: { id: draftId } });
        if (!draft) {
            throw new Error(`Borrador con ID ${draftId} no encontrado`);
        }

        if (!draft.content) {
            throw new Error(`El borrador ID ${draftId} no tiene contenido para enviar a Bluestacks CMS`);
        }

        let articleData: NewsArticleData;
        try {
            articleData = JSON.parse(draft.content);
        } catch (parseErr: any) {
            throw new Error(`El contenido del borrador ID ${draftId} no es un JSON válido: ${parseErr.message}`);
        }

        try {
            const bluestacksCms = new BluestacksCmsService();
            console.log(`📝 [Publish Draft to CMS Only] Creando borrador en Bluestacks CMS para borrador ID ${draftId}...`);
            const createRes = await bluestacksCms.createNewsDraft(articleData);
            const cmsPath = createRes.cmsPath;
            if (!cmsPath) {
                throw new Error('Bluestacks CMS no devolvió un cmsPath válido al crear el borrador');
            }

            articleData.cmsPath = cmsPath;
            draft.content = JSON.stringify(articleData);
            draft.updatedAt = new Date();
            const savedDraft = await draftRepo.save(draft);

            console.log(`✅ [Publish Draft to CMS Only][SUCCESS] Borrador ID ${draftId} creado en Bluestacks CMS (sin publicar):`, JSON.stringify({
                id: savedDraft.id,
                status: savedDraft.status,
                cmsPath
            }));

            return {
                ...savedDraft,
                cmsPath,
                articleData
            };
        } catch (cmsErr: any) {
            console.error(`❌ [Publish Draft to CMS Only][ERROR] Falló la creación del borrador ID ${draftId} en Bluestacks CMS:`, {
                draftId,
                message: cmsErr.message,
                stack: cmsErr.stack
            });
            throw cmsErr;
        }
    }

    async publishDraft(draftId: number) {
        console.log(`🚀 [Publish Draft] Iniciando publicación de borrador ID: ${draftId}`);

        if (!AppDataSource.isInitialized) {
            throw new Error('Database not initialized');
        }
        const draftRepo = AppDataSource.getRepository(NocNewsDraft);
        const draft = await draftRepo.findOne({ where: { id: draftId } });
        if (!draft) {
            throw new Error(`Borrador con ID ${draftId} no encontrado`);
        }

        if (!draft.content) {
            throw new Error(`El borrador ID ${draftId} no tiene contenido para publicar`);
        }

        let articleData: NewsArticleData;
        try {
            articleData = JSON.parse(draft.content);
        } catch (parseErr: any) {
            throw new Error(`El contenido del borrador ID ${draftId} no es un JSON válido: ${parseErr.message}`);
        }

        let cmsPath = (articleData as any)?.cmsPath;
        let publishedUrl: string;
        console.log(`📋 [Publish Draft] Datos del borrador ID ${draftId}:`, JSON.stringify({
            id: draft.id,
            title: articleData.title || draft.title,
            currentStatus: draft.status,
            existingCmsPath: cmsPath || null
        }));

        try {
            const bluestacksCms = new BluestacksCmsService();

            if (!cmsPath) {
                console.log(`📝 [Publish Draft] Creando noticia en Bluestacks CMS para borrador ID ${draftId}...`);
                const createRes = await bluestacksCms.createNewsDraft(articleData);
                cmsPath = createRes.cmsPath;
                if (!cmsPath) {
                    throw new Error('Bluestacks CMS no devolvió un cmsPath válido al crear el borrador');
                }
                (articleData as any).cmsPath = cmsPath;
                draft.content = JSON.stringify(articleData);
                draft.updatedAt = new Date();
                await draftRepo.save(draft);
            }

            console.log(`🌐 [Publish Draft] Publicando noticia en Bluestacks CMS (cmsPath: ${cmsPath})...`);
            await bluestacksCms.publishNews(cmsPath);

            console.log(`🔗 [Publish Draft] Consultando URL pública de la noticia en Bluestacks CMS (cmsPath: ${cmsPath})...`);
            publishedUrl = await bluestacksCms.getPublishedNewsUrl(cmsPath);
        } catch (cmsErr: any) {
            console.error(`❌ [Publish Draft][ERROR] Falló la publicación del borrador ID ${draftId} en Bluestacks CMS:`, {
                draftId,
                cmsPath: cmsPath || null,
                message: cmsErr.message,
                stack: cmsErr.stack
            });
            throw cmsErr;
        }

        draft.path = publishedUrl;
        draft.status = 'published';
        draft.publishedAt = new Date();
        draft.updatedAt = new Date();
        const savedDraft = await draftRepo.save(draft);

        console.log(`✅ [Publish Draft][SUCCESS] Borrador ID ${draftId} publicado exitosamente en Bluestacks CMS:`, JSON.stringify({
            id: savedDraft.id,
            status: savedDraft.status,
            path: savedDraft.path,
            publishedAt: savedDraft.publishedAt
        }));

        return savedDraft;
    }

    async previewDraft(path: string) {
        return { success: true, message: 'Preview is now handled locally by structured draft editor' };
    }

    private async step1_extractNews(topic: string, userInstructions: string | null, sources: string[], reference?: string): Promise<any> {
        const payload = {
            environment: 'prod',
            async: false,
            data: {
                topic,
                userInstructions,
                sources
            }
        };

        const result = await this.callAzembliaAutomation(
            NocNewsSchedulerService.AZEMBLIA_AUTOMATIONS.newsResearch,
            payload,
            180000,
            'Paso 1 - Extracción de Noticias con IA',
            reference
        );

        if (result && (result.rawFacts || result.keyContext)) {
            return result;
        }
        throw new Error('La respuesta de Azemblia no contiene la estructura esperada (rawFacts/keyContext)');
    }

    private async step2_draftArticle(topic: string, userInstructions: string | null, extractedData: any, reference?: string): Promise<any> {
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

        const result = await this.callAzembliaAutomation(
            NocNewsSchedulerService.AZEMBLIA_AUTOMATIONS.newsDraft,
            payload,
            180000,
            'Paso 2 - Redacción Periodística con IA',
            reference
        );

        if (result && result.title && (result.blocks || result.paragraphs)) {
            return result;
        }
        throw new Error('La respuesta de Azemblia no contiene la estructura esperada del artículo (title/blocks)');
    }

    private isSafeImageUrl(urlStr: string): boolean {
        try {
            const parsed = new URL(urlStr);
            if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
                return false;
            }

            const hostname = parsed.hostname.toLowerCase();

            if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '0.0.0.0') {
                return false;
            }

            if (hostname.startsWith('169.254.') || hostname.endsWith('.internal') || hostname.endsWith('.local')) {
                return false;
            }

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

        if (imageUrl.includes('.blob.core.windows.net')) {
            return imageUrl;
        }

        if (!this.isSafeImageUrl(imageUrl)) {
            throw new Error(`[Security Alert] Rechazada URL sospechosa de SSRF en persistImage: ${imageUrl}`);
        }

        console.log(`📥 [Storage Persistence] Downloading image from: ${imageUrl.substring(0, 80)}...`);
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 45000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            },
            maxContentLength: 20 * 1024 * 1024
        });

        const buffer = Buffer.from(response.data);
        const fileName = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.jpg`;

        const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME?.trim();
        const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY?.trim();
        const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME?.trim();

        if (!accountName) {
            throw new Error('La variable de entorno AZURE_STORAGE_ACCOUNT_NAME es requerida y no está configurada o es inválida.');
        }
        if (!accountKey) {
            throw new Error('La variable de entorno AZURE_STORAGE_ACCOUNT_KEY es requerida y no está configurada o es inválida.');
        }
        if (!containerName) {
            throw new Error('La variable de entorno AZURE_STORAGE_CONTAINER_NAME es requerida y no está configurada o es inválida.');
        }

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
    }

    private async step3_generateImage(prompt: string, contextTopic: string, reference?: string): Promise<string> {
        const payload = {
            environment: 'prod',
            async: false,
            data: {
                prompt,
                context: contextTopic
            }
        };

        const result = await this.callAzembliaAutomation(
            NocNewsSchedulerService.AZEMBLIA_AUTOMATIONS.newsImage,
            payload,
            120000,
            'Paso 3 - Generación de Imagen con IA',
            reference
        );

        if (result && (result.imageUrl || result.url)) {
            const tempUrl = result.imageUrl || result.url;
            const persistentUrl = await this.persistImage(tempUrl, 'noc-news');
            return persistentUrl;
        }
        throw new Error('La respuesta de Azemblia no devolvió una URL válida de imagen (imageUrl/url)');
    }

    async executeSchedule(id: string) {
        if (!AppDataSource.isInitialized) {
            throw new Error('Database not initialized');
        }
        const schedule = await this.repository.findOne({ where: { id } });
        if (!schedule) {
            throw new Error(`Artículo con ID ${id} no encontrado`);
        }

        const sources = schedule.sources ? (typeof schedule.sources === 'string' ? JSON.parse(schedule.sources) : schedule.sources) : [];

        // Pre-crear el borrador para obtener su ID único y enviar la misma reference (borrador-<id>)
        // en todos los pasos de generación y futuros ajustes de la misma noticia.
        const draftRepo = AppDataSource.getRepository(NocNewsDraft);
        const initialDraft = await draftRepo.save(
            draftRepo.create({
                scheduleId: schedule.id,
                title: schedule.name,
                subtitle: null,
                content: null,
                path: null,
                status: 'generating',
                createdAt: new Date(),
                updatedAt: new Date(),
                publishedAt: null
            })
        );
        const reference = this.formatDraftReference(initialDraft.id);

        const startTime = Date.now();
        console.log(`🚀 [Pipeline Orchestrator] Starting news generation for Schedule ID: "${id}" | Draft Ref: "${reference}" | Name: "${schedule.name}" | Topic: "${schedule.topic}"`);

        let extractedData: any;
        let draftedContent: any;
        let coverImageUrl: string;
        const blocks: NewsBlock[] = [];

        try {
            extractedData = await this.step1_extractNews(
                schedule.topic,
                schedule.userInstructions,
                Array.isArray(sources) ? sources : [],
                reference
            );
            console.log(`📋 [Pipeline Step 1 Done] Facts extracted: ${extractedData.rawFacts?.length || 0} | Context length: ${extractedData.keyContext?.length || 0} chars`);

            draftedContent = await this.step2_draftArticle(
                schedule.topic,
                schedule.userInstructions,
                extractedData,
                reference
            );
            console.log(`✍️ [Pipeline Step 2 Done] Article drafted: "${draftedContent.title}" | Proposed blocks: ${draftedContent.blocks?.length || 0}`);

            console.log(`🎨 [Pipeline Step 3 Starting] Generating cover image with prompt: "${draftedContent.coverImagePrompt}"`);
            coverImageUrl = await this.step3_generateImage(
                draftedContent.coverImagePrompt || `Photojournalism of ${schedule.topic}`,
                schedule.topic,
                reference
            );
            console.log(`🖼️ [Pipeline Step 3 Cover Done] Cover URL: ${coverImageUrl}`);

            let blockIndex = 1;

            if (draftedContent.blocks && Array.isArray(draftedContent.blocks)) {
                for (const b of draftedContent.blocks) {
                    if (b.type === 'image') {
                        const imgPrompt = b.content || b.prompt || `Photojournalism illustrating ${schedule.topic}`;
                        console.log(`🎨 [Pipeline Block Image] Generating in-article image #${blockIndex} with prompt: "${imgPrompt}"`);
                        const imgUrl = await this.step3_generateImage(imgPrompt, schedule.topic, reference);
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
        } catch (pipelineErr) {
            try {
                await draftRepo.delete({ id: initialDraft.id });
            } catch (cleanupErr) {
                console.error(`⚠️ [Pipeline Cleanup] Could not delete temporary draft ${initialDraft.id}:`, cleanupErr);
            }
            throw pipelineErr;
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

        const now = new Date();
        schedule.lastRunAt = now;
        const configObj = typeof schedule.scheduleConfig === 'string' ? JSON.parse(schedule.scheduleConfig || '{}') : (schedule.scheduleConfig || {});
        const nextRun = this.calculateNextRunFromConfig(configObj, schedule.startAt.toISOString(), now);
        schedule.nextRunAt = nextRun;
        schedule.status = nextRun ? 'Pending' : 'Completed';

        if (schedule.serviceBusSequenceNumber) {
            await azureServiceBusSchedulerService.cancelScheduledExecution(schedule.serviceBusSequenceNumber);
            schedule.serviceBusSequenceNumber = null;
        }
        if (nextRun && schedule.isActive) {
            schedule.serviceBusSequenceNumber = await azureServiceBusSchedulerService.scheduleExecution(schedule.id, nextRun);
        }

        const updatedSchedule = await this.repository.save(schedule);

        initialDraft.title = createdArticleData.title;
        initialDraft.subtitle = createdArticleData.subtitle;
        initialDraft.content = JSON.stringify(createdArticleData);
        initialDraft.path = null;
        initialDraft.status = 'pending';
        initialDraft.updatedAt = now;
        let savedDraft = await draftRepo.save(initialDraft);

        const totalDurationSec = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`✅ [Pipeline Completed] Draft ID: ${savedDraft.id} | Total Time: ${totalDurationSec}s | Next Run: ${nextRun ? nextRun.toISOString() : 'None'}`);

        if (schedule.publishAutomatically) {
            console.log(`🌐 [Auto-Publish] Auto-publishing draft ID: ${savedDraft.id} to Bluestacks CMS...`);
            savedDraft = await this.publishDraft(savedDraft.id);
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

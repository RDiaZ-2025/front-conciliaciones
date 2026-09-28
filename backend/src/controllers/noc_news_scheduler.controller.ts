import { Request, Response } from 'express';
import { NocNewsSchedulerService } from '../services/noc_news_scheduler.service';
import { asyncHandler } from '../utils/asyncHandler';

const schedulerService = new NocNewsSchedulerService();

export class NocNewsSchedulerController {
    getSchedules = asyncHandler(async (req: Request, res: Response) => {
        const schedules = await schedulerService.getAllSchedules();
        res.status(200).json(schedules);
    });

    getScheduleById = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const schedule = await schedulerService.getScheduleById(id);
        if (!schedule) {
            res.status(404).json({ message: 'Agendamiento no encontrado' });
            return;
        }
        res.status(200).json(schedule);
    });

    createSchedule = asyncHandler(async (req: Request, res: Response) => {
        const { name, topic, userInstructions, sources, startAt, scheduleConfig, isActive, publishAutomatically } = req.body;
        if (!name || !topic || !sources || !startAt || !scheduleConfig) {
            res.status(400).json({ message: 'Faltan campos requeridos para el agendamiento' });
            return;
        }
        const schedule = await schedulerService.createSchedule({
            name,
            topic,
            userInstructions,
            sources,
            startAt,
            scheduleConfig,
            isActive,
            publishAutomatically
        });
        res.status(201).json(schedule);
    });

    updateSchedule = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const updated = await schedulerService.updateSchedule(id, req.body);
        if (!updated) {
            res.status(404).json({ message: 'Agendamiento no encontrado' });
            return;
        }
        res.status(200).json(updated);
    });

    toggleActive = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const updated = await schedulerService.toggleActive(id);
        if (!updated) {
            res.status(404).json({ message: 'Agendamiento no encontrado' });
            return;
        }
        res.status(200).json(updated);
    });

    deleteSchedule = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const success = await schedulerService.deleteSchedule(id);
        if (!success) {
            res.status(404).json({ message: 'Agendamiento no encontrado o ya eliminado' });
            return;
        }
        res.status(200).json({ message: 'Agendamiento eliminado correctamente' });
    });

    recordExecution = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const updated = await schedulerService.recordExecution(id);
        if (!updated) {
            res.status(404).json({ message: 'Agendamiento no encontrado' });
            return;
        }
        res.status(200).json(updated);
    });

    saveDraft = asyncHandler(async (req: Request, res: Response) => {
        const { scheduleId, path } = req.body;
        if (!scheduleId || !path) {
            res.status(400).json({ message: 'Faltan campos requeridos (scheduleId, path)' });
            return;
        }
        const draft = await schedulerService.saveDraft(scheduleId, path);
        res.status(201).json(draft);
    });

    getDrafts = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const drafts = await schedulerService.getDraftsByScheduleId(id);
        res.status(200).json(drafts);
    });

    previewDraft = asyncHandler(async (req: Request, res: Response) => {
        const { path } = req.body;
        if (!path) {
            res.status(400).json({ message: 'Falta campo requerido (path)' });
            return;
        }
        const preview = await schedulerService.previewDraft(path);
        res.status(200).json(preview);
    });

    publishDraft = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const draft = await schedulerService.publishDraft(parseInt(id, 10));
        res.status(200).json(draft);
    });

    getDraftDetail = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const draft = await schedulerService.getDraftById(parseInt(id, 10));
        if (!draft) {
            res.status(404).json({ message: 'Borrador no encontrado' });
            return;
        }
        res.status(200).json(draft);
    });

    updateDraft = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const articleData = req.body;
        if (!articleData) {
            res.status(400).json({ message: 'Faltan datos del artículo' });
            return;
        }
        const updated = await schedulerService.updateDraft(parseInt(id, 10), articleData);
        res.status(200).json(updated);
    });

    deleteDraft = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        try {
            const success = await schedulerService.deleteDraft(parseInt(id, 10));
            if (!success) {
                res.status(404).json({ message: 'Borrador no encontrado o ya eliminado' });
                return;
            }
            res.status(200).json({ success: true, message: 'Borrador eliminado correctamente' });
        } catch (error: any) {
            console.error('Error deleting draft:', error);
            res.status(400).json({ success: false, message: error.message });
        }
    });

    aiAdjustParagraph = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const { blockId, currentText, instruction } = req.body;
        if (!instruction) {
            res.status(400).json({ message: 'La instrucción en lenguaje natural es requerida' });
            return;
        }
        const result = await schedulerService.aiAdjustParagraph(parseInt(id, 10), blockId, currentText || '', instruction);
        res.status(200).json(result);
    });

    aiAdjustArticle = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const { instruction, articleData } = req.body;
        if (!instruction || !articleData) {
            res.status(400).json({ message: 'La instrucción y la estructura del artículo son requeridas' });
            return;
        }
        const result = await schedulerService.aiAdjustArticle(parseInt(id, 10), instruction, articleData);
        res.status(200).json(result);
    });

    aiRegenerateImage = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const { blockId, currentUrl, prompt, instruction } = req.body;
        if (!instruction && !prompt) {
            res.status(400).json({ message: 'Se requiere una instrucción o prompt para la imagen' });
            return;
        }
        const result = await schedulerService.aiRegenerateImage(parseInt(id, 10), blockId, currentUrl || '', prompt || '', instruction || '');
        res.status(200).json(result);
    });

    executeSchedule = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const result = await schedulerService.executeSchedule(id);
        res.status(200).json(result);
    });
}

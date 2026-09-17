import { Request, Response } from 'express';
import { NocNewsSchedulerService } from '../services/noc_news_scheduler.service';

const schedulerService = new NocNewsSchedulerService();

export class NocNewsSchedulerController {
    async getSchedules(req: Request, res: Response): Promise<void> {
        try {
            const schedules = await schedulerService.getAllSchedules();
            res.status(200).json(schedules);
        } catch (error: any) {
            console.error('Error fetching news schedules:', error);
            res.status(500).json({ message: 'Error interno al obtener agendamientos de noticias', error: error.message });
        }
    }

    async getScheduleById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const schedule = await schedulerService.getScheduleById(id);
            if (!schedule) {
                res.status(404).json({ message: 'Agendamiento no encontrado' });
                return;
            }
            res.status(200).json(schedule);
        } catch (error: any) {
            console.error('Error fetching news schedule:', error);
            res.status(500).json({ message: 'Error interno al obtener agendamiento', error: error.message });
        }
    }

    async createSchedule(req: Request, res: Response): Promise<void> {
        try {
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
        } catch (error: any) {
            console.error('Error creating news schedule:', error);
            res.status(500).json({ message: 'Error interno al crear agendamiento', error: error.message });
        }
    }

    async updateSchedule(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const updated = await schedulerService.updateSchedule(id, req.body);
            if (!updated) {
                res.status(404).json({ message: 'Agendamiento no encontrado' });
                return;
            }
            res.status(200).json(updated);
        } catch (error: any) {
            console.error('Error updating news schedule:', error);
            res.status(500).json({ message: 'Error interno al actualizar agendamiento', error: error.message });
        }
    }

    async toggleActive(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const updated = await schedulerService.toggleActive(id);
            if (!updated) {
                res.status(404).json({ message: 'Agendamiento no encontrado' });
                return;
            }
            res.status(200).json(updated);
        } catch (error: any) {
            console.error('Error toggling news schedule active state:', error);
            res.status(500).json({ message: 'Error interno al alternar estado del agendamiento', error: error.message });
        }
    }

    async deleteSchedule(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const success = await schedulerService.deleteSchedule(id);
            if (!success) {
                res.status(404).json({ message: 'Agendamiento no encontrado o ya eliminado' });
                return;
            }
            res.status(200).json({ message: 'Agendamiento eliminado correctamente' });
        } catch (error: any) {
            console.error('Error deleting news schedule:', error);
            res.status(500).json({ message: 'Error interno al eliminar agendamiento', error: error.message });
        }
    }

    async recordExecution(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const updated = await schedulerService.recordExecution(id);
            if (!updated) {
                res.status(404).json({ message: 'Agendamiento no encontrado' });
                return;
            }
            res.status(200).json(updated);
        } catch (error: any) {
            console.error('Error recording execution:', error);
            res.status(500).json({ message: 'Error interno al registrar ejecución', error: error.message });
        }
    }

    async saveDraft(req: Request, res: Response): Promise<void> {
        try {
            const { scheduleId, path } = req.body;
            if (!scheduleId || !path) {
                res.status(400).json({ message: 'Faltan campos requeridos (scheduleId, path)' });
                return;
            }
            const draft = await schedulerService.saveDraft(scheduleId, path);
            res.status(201).json(draft);
        } catch (error: any) {
            console.error('Error saving news draft:', error);
            res.status(500).json({ message: 'Error interno al guardar el borrador de noticia', error: error.message });
        }
    }

    async getDrafts(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const drafts = await schedulerService.getDraftsByScheduleId(id);
            res.status(200).json(drafts);
        } catch (error: any) {
            console.error('Error fetching news drafts:', error);
            res.status(500).json({ message: 'Error interno al obtener los borradores de noticias', error: error.message });
        }
    }

    async previewDraft(req: Request, res: Response): Promise<void> {
        try {
            const { path } = req.body;
            if (!path) {
                res.status(400).json({ message: 'Falta campo requerido (path)' });
                return;
            }
            const preview = await schedulerService.previewDraft(path);
            res.status(200).json(preview);
        } catch (error: any) {
            console.error('Error previewing news draft:', error);
            res.status(500).json({ message: 'Error interno al obtener la previsualización de la noticia', error: error.message });
        }
    }

    async publishDraft(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const draft = await schedulerService.publishDraft(parseInt(id));
            res.status(200).json(draft);
        } catch (error: any) {
            console.error('Error publishing news draft:', error);
            res.status(500).json({ message: 'Error interno al publicar la noticia', error: error.message });
        }
    }

    async getDraftDetail(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const draft = await schedulerService.getDraftById(parseInt(id));
            if (!draft) {
                res.status(404).json({ message: 'Borrador no encontrado' });
                return;
            }
            res.status(200).json(draft);
        } catch (error: any) {
            console.error('Error fetching draft detail:', error);
            res.status(500).json({ message: 'Error interno al obtener detalle del borrador', error: error.message });
        }
    }

    async updateDraft(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const articleData = req.body;
            if (!articleData) {
                res.status(400).json({ message: 'Faltan datos del artículo' });
                return;
            }
            const updated = await schedulerService.updateDraft(parseInt(id), articleData);
            res.status(200).json(updated);
        } catch (error: any) {
            console.error('Error updating draft:', error);
            res.status(500).json({ message: 'Error interno al actualizar el borrador', error: error.message });
        }
    }

    async deleteDraft(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
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
    }

    async aiAdjustParagraph(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { blockId, currentText, instruction } = req.body;
            if (!instruction) {
                res.status(400).json({ message: 'La instrucción en lenguaje natural es requerida' });
                return;
            }
            const result = await schedulerService.aiAdjustParagraph(parseInt(id), blockId, currentText || '', instruction);
            res.status(200).json(result);
        } catch (error: any) {
            console.error('Error in aiAdjustParagraph:', error);
            res.status(500).json({ message: 'Error al ajustar párrafo con IA', error: error.message });
        }
    }

    async aiAdjustArticle(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { instruction, articleData } = req.body;
            if (!instruction || !articleData) {
                res.status(400).json({ message: 'La instrucción y la estructura del artículo son requeridas' });
                return;
            }
            const result = await schedulerService.aiAdjustArticle(parseInt(id), instruction, articleData);
            res.status(200).json(result);
        } catch (error: any) {
            console.error('Error in aiAdjustArticle:', error);
            res.status(500).json({ message: 'Error al realizar ajuste global con IA', error: error.message });
        }
    }

    async aiRegenerateImage(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { blockId, currentUrl, prompt, instruction } = req.body;
            if (!instruction && !prompt) {
                res.status(400).json({ message: 'Se requiere una instrucción o prompt para la imagen' });
                return;
            }
            const result = await schedulerService.aiRegenerateImage(parseInt(id), blockId, currentUrl || '', prompt || '', instruction || '');
            res.status(200).json(result);
        } catch (error: any) {
            console.error('Error in aiRegenerateImage:', error);
            res.status(500).json({ message: 'Error al regenerar imagen con IA', error: error.message });
        }
    }

    async executeSchedule(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const result = await schedulerService.executeSchedule(id);
            res.status(200).json(result);
        } catch (error: any) {
            console.error('Error executing news schedule:', error);
            res.status(500).json({ message: error.message || 'Error interno al ejecutar agendamiento' });
        }
    }
}

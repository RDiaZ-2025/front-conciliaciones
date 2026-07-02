import { Request, Response } from 'express';
import { NocNewsSchedulerService } from '../services/nocNewsScheduler.service';

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
            const { name, topic, userInstructions, sources, startAt, scheduleConfig, isActive } = req.body;
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
                isActive
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
}

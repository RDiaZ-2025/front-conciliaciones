import { Request, Response } from 'express';
import { AppDataSource } from '../config/typeorm.config';
import { ProductionRequest } from '../models/ProductionRequest';
import { User } from '../models/User';
import { LessThan, MoreThan, Between, Not, In } from 'typeorm';
import { WORKFLOW_STAGES } from '../constants/workflow';

export class RequestsReportController {
  static async getDashboardStats(req: Request, res: Response): Promise<Response> {
    try {
      if (!AppDataSource.isInitialized) {
        return res.status(503).json({ message: 'Database not available' });
      }

      const userId = (req as any).user?.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const requestRepo = AppDataSource.getRepository(ProductionRequest);
      const userRepo = AppDataSource.getRepository(User);

      const subordinates = await userRepo.find({
        where: { bossId: userId, status: 1 },
        select: ['id']
      });

      const subordinateIds = subordinates.map(u => u.id);

      let whereClause: any = {};

      if (subordinateIds.length > 0) {
        whereClause = {
          assignedUserId: In(subordinateIds)
        };
      } else {
        whereClause = {
          assignedUserId: -1
        };
      }

      const now = new Date();
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(now.getDate() + 3);

      const total = await requestRepo.count({ where: whereClause });
      const totalActive = await requestRepo.count({
        where: {
          ...whereClause,
          status: Not(In(['completed', 'cancelled']))
        }
      });

      const completed = await requestRepo.count({
        where: {
          ...whereClause,
          status: 'completed'
        }
      });

      const cancelled = await requestRepo.count({
        where: {
          ...whereClause,
          status: 'cancelled'
        }
      });

      const overdue = await requestRepo.count({
        where: {
          ...whereClause,
          status: Not(In(['completed', 'cancelled'])),
          deliveryDate: LessThan(now)
        }
      });

      const atRisk = await requestRepo.count({
        where: {
          ...whereClause,
          status: Not(In(['completed', 'cancelled'])),
          deliveryDate: Between(now, threeDaysFromNow)
        }
      });

      const inProgressCount = await requestRepo.count({
        where: {
          ...whereClause,
          status: In(['in_progress', 'in_edit'])
        }
      });

      const pendingCount = await requestRepo.count({
        where: {
          ...whereClause,
          status: In(['request', 'quotation'])
        }
      });
      const completedCount = completed;
      const cancelledCount = cancelled;

      const allUsers = await userRepo.find({
        where: {
          id: In(subordinateIds),
          status: 1
        }
      });

      const workloadRaw = await requestRepo
        .createQueryBuilder('pr')
        .select('pr.assignedUserId', 'userId')
        .addSelect('COUNT(pr.id)', 'count')
        .where('pr.status NOT IN (:...statuses)', { statuses: ['completed', 'cancelled'] })
        .andWhere('pr.assignedUserId IN (:...ids)', { ids: subordinateIds.length > 0 ? subordinateIds : [-1] })
        .groupBy('pr.assignedUserId')
        .getRawMany();

      const workloadMap = new Map<number, number>();
      workloadRaw.forEach(w => {
        workloadMap.set(w.userId, parseInt(w.count));
      });

      const workload = allUsers.map(user => {
        const count = workloadMap.get(user.id) || 0;

        let status: 'normal' | 'overloaded' | 'underutilized' = 'normal';
        if (count > 5) status = 'overloaded';
        if (count < 2) status = 'underutilized';

        const percentage = Math.min(count * 10, 100);

        return {
          userName: user.name,
          count: count,
          percentage: percentage,
          status: status
        };
      })
        .filter(w => w.count > 0)
        .sort((a, b) => b.count - a.count);

      const recentTasksRaw = await requestRepo.find({
        where: {
          ...whereClause,
          status: Not(In(['completed', 'cancelled']))
        },
        relations: ['assignedUser'],
        order: { deliveryDate: 'ASC' }
      });

      const recentTasks = recentTasksRaw.map(task => {
        let statusDisplay = task.status || 'unknown';

        const translations: { [key: string]: string } = {
          'quotation': 'Cotización',
          'in_edit': 'En Edición',
          'in_progress': 'En Curso',
          'completed': 'Completada',
          'cancelled': 'Cancelada'
        };

        statusDisplay = translations[statusDisplay] || statusDisplay;

        if (task.isOverdue()) statusDisplay = 'ATRASADA';
        else if (task.deliveryDate && task.deliveryDate <= threeDaysFromNow && task.deliveryDate >= now) statusDisplay = 'En Riesgo';

        return {
          task: task.name,
          responsible: task.assignedUser ? task.assignedUser.name : 'Sin Asignar',
          account: task.department || 'General',
          status: statusDisplay.toUpperCase(),
          deadline: task.deliveryDate ? task.deliveryDate.toISOString().split('T')[0] : 'Sin Fecha',
          avatar: null
        };
      });

      // Calculate stage stats based on WORKFLOW_STAGES
      const stageCountsRaw = await requestRepo
        .createQueryBuilder('pr')
        .select('pr.status', 'status')
        .addSelect('COUNT(pr.id)', 'count')
        .where(whereClause)
        .groupBy('pr.status')
        .getRawMany();

      const stageCountsMap = new Map<string, number>();
      stageCountsRaw.forEach(s => {
        stageCountsMap.set(s.status, parseInt(s.count));
      });

      const stagesStats = WORKFLOW_STAGES.map(stage => ({
        id: stage.id,
        label: stage.label,
        count: stageCountsMap.get(stage.id) || 0
      }));

      return res.json({
        total,
        active: totalActive,
        completed,
        atRisk,
        overdue,
        cancelled,
        workload,
        executionStatus: {
          inProgress: inProgressCount,
          completed: completedCount,
          pending: pendingCount,
          cancelled: cancelledCount
        },
        recentTasks,
        stages: stagesStats
      });

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return res.status(500).json({ message: 'Error fetching dashboard stats', error });
    }
  }
}

import { Request, Response } from 'express';
import { AppDataSource } from '../config/typeorm.config';
import { ProductionRequest } from '../models/ProductionRequest';
import { User } from '../models/User';
import { LessThan, MoreThan, Between, Not, In } from 'typeorm';

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

      // Get subordinates IDs
      const subordinates = await userRepo.find({
        where: { bossId: userId, status: 1 },
        select: ['id']
      });

      const subordinateIds = subordinates.map(u => u.id);

      // If no subordinates, return empty stats (or just own requests if desired, but request says "assigned to their employees")
      // Assuming we only want to see team's requests. If the user also processes requests, we might add userId to the list.
      // For now, adhering strictly to "assigned to their employees".

      let whereClause: any = {};

      if (subordinateIds.length > 0) {
        whereClause = {
          assignedUserId: In(subordinateIds)
        };
      } else {
        // If no subordinates, maybe return empty or just return nothing found
        // To be safe and avoid showing all requests, we force a condition that returns nothing if no subordinates
        whereClause = {
          assignedUserId: -1 // Impossible ID
        };
      }

      const now = new Date();
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(now.getDate() + 3);

      // 1. Basic Counts
      const total = await requestRepo.count({ where: whereClause });
      const totalActive = await requestRepo.count({
        where: {
          ...whereClause,
          status: {
            code: Not(In(['completed', 'cancelled']))
          }
        },
        relations: ['status']
      });

      const completed = await requestRepo.count({
        where: {
          ...whereClause,
          status: {
            code: 'completed'
          }
        },
        relations: ['status']
      });

      const cancelled = await requestRepo.count({
        where: {
          ...whereClause,
          status: {
            code: 'cancelled'
          }
        },
        relations: ['status']
      });

      // Overdue: Active AND deliveryDate < now
      const overdue = await requestRepo.count({
        where: {
          ...whereClause,
          status: {
            code: Not(In(['completed', 'cancelled']))
          },
          deliveryDate: LessThan(now)
        },
        relations: ['status']
      });

      // At Risk: Active AND deliveryDate between now and now + 3 days
      const atRisk = await requestRepo.count({
        where: {
          ...whereClause,
          status: {
            code: Not(In(['completed', 'cancelled']))
          },
          deliveryDate: Between(now, threeDaysFromNow)
        }
      });

      // 2. Execution Status (Pie Chart)
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

      // 3. Workload by User (Bar Chart)
      // Get all active requests and group by assignedUserId
      // First, get ALL users to ensure we display everyone
      const allUsers = await userRepo.find({
        where: {
          id: In(subordinateIds),
          status: 1
        }
      });

      // Get counts for active requests
      const workloadRaw = await requestRepo
        .createQueryBuilder('pr')
        .select('pr.assignedUserId', 'userId')
        .addSelect('COUNT(pr.id)', 'count')
        .where('pr.status NOT IN (:...statuses)', { statuses: ['completed', 'cancelled'] })
        .andWhere('pr.assignedUserId IN (:...ids)', { ids: subordinateIds.length > 0 ? subordinateIds : [-1] })
        .groupBy('pr.assignedUserId')
        .getRawMany();

      // Create a map for quick lookup
      const workloadMap = new Map<number, number>();
      workloadRaw.forEach(w => {
        workloadMap.set(w.userId, parseInt(w.count));
      });

      // Filter users who have at least one request OR belong to the 'Producción' team if applicable.
      // Based on requirement "Requests per User", we should prioritize accuracy.

      const workload = allUsers.map(user => {
        const count = workloadMap.get(user.id) || 0;

        // Simple logic for status: > 5 overloaded, < 2 underutilized, else normal
        let status: 'normal' | 'overloaded' | 'underutilized' = 'normal';
        if (count > 5) status = 'overloaded';
        if (count < 2) status = 'underutilized';

        // Mock percentage for demo: count * 10
        const percentage = Math.min(count * 10, 100);

        return {
          userName: user.name,
          count: count,
          percentage: percentage,
          status: status
        };
      })
        .filter(w => w.count > 0) // Only show users with active requests to keep chart clean
        .sort((a, b) => b.count - a.count);

      // 4. Recent Tasks (Table)
      const recentTasksRaw = await requestRepo.find({
        where: {
          ...whereClause,
          status: Not(In(['completed', 'cancelled']))
        },
        relations: ['assignedUser'],
        order: { deliveryDate: 'ASC' } // Earliest deadline first
      });

      const recentTasks = recentTasksRaw.map(task => {
        let statusDisplay = task.status || 'unknown';

        // Translate stages
        const translations: { [key: string]: string } = {
          'request': 'Solicitud',
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
          avatar: null // Placeholder
        };
      });

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
        recentTasks
      });

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return res.status(500).json({ message: 'Error fetching dashboard stats', error });
    }
  }
}

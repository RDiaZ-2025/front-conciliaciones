import { AppDataSource } from '../config/typeorm.config';
import { ProductionRequest } from '../models/ProductionRequest';
import { User } from '../models/User';
import { LessThan, MoreThan, Between, Not, In } from 'typeorm';

export class RequestsReportService {
  async getDashboardStats(userId: number): Promise<any> {
    if (!AppDataSource.isInitialized) {
      throw new Error('Database not available');
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
      whereClause = { assignedUserId: In(subordinateIds) };
    } else {
      whereClause = { assignedUserId: -1 };
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
      where: { ...whereClause, status: 'completed' }
    });

    const cancelled = await requestRepo.count({
      where: { ...whereClause, status: 'cancelled' }
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

    const allUsers = await userRepo.find({
      where: { status: 1 },
      select: ['id', 'name', 'email']
    });

    return {
      success: true,
      data: {
        total,
        active: totalActive,
        completed,
        cancelled,
        overdue,
        atRisk,
        inProgress: inProgressCount,
        pending: pendingCount,
        users: allUsers
      }
    };
  }

  async getMyRequestsStats(userId: number): Promise<any> {
    if (!AppDataSource.isInitialized) {
      throw new Error('Database not available');
    }

    const requestRepo = AppDataSource.getRepository(ProductionRequest);

    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);

    const total = await requestRepo.count({ where: { assignedUserId: userId } });
    const totalActive = await requestRepo.count({
      where: { assignedUserId: userId, status: Not(In(['completed', 'cancelled'])) }
    });
    const completed = await requestRepo.count({
      where: { assignedUserId: userId, status: 'completed' }
    });
    const cancelled = await requestRepo.count({
      where: { assignedUserId: userId, status: 'cancelled' }
    });
    const overdue = await requestRepo.count({
      where: {
        assignedUserId: userId,
        status: Not(In(['completed', 'cancelled'])),
        deliveryDate: LessThan(now)
      }
    });
    const atRisk = await requestRepo.count({
      where: {
        assignedUserId: userId,
        status: Not(In(['completed', 'cancelled'])),
        deliveryDate: Between(now, threeDaysFromNow)
      }
    });
    const inProgressCount = await requestRepo.count({
      where: { assignedUserId: userId, status: In(['in_progress', 'in_edit']) }
    });
    const pendingCount = await requestRepo.count({
      where: { assignedUserId: userId, status: In(['request', 'quotation']) }
    });

    return {
      success: true,
      data: {
        total,
        active: totalActive,
        completed,
        cancelled,
        overdue,
        atRisk,
        inProgress: inProgressCount,
        pending: pendingCount
      }
    };
  }
}

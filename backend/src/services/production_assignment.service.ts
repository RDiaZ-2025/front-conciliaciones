import { AppDataSource } from "../config/typeorm.config";
import { User, Team, ProductionRequest, DynamicSubmissionWorkflowState } from "../models";
import { Not, In } from "typeorm";

export class ProductionAssignmentService {
  /**
   * Asigna de manera inteligente un usuario del departamento especificado
   * balanceando la carga de trabajo entre los miembros activos del equipo.
   */
  async performSmartAssignment(department: string): Promise<{ assignedUserId: number, userName: string, activeRequestsCount: number } | null> {
    try {
      if (!AppDataSource.isInitialized) return null;
      const teamRepository = AppDataSource.getRepository(Team);
      const team = await teamRepository.findOne({ where: { name: department } });

      if (team) {
        const userRepository = AppDataSource.getRepository(User);
        const users = await userRepository.find({ where: { teamId: team.id, status: 1 } });

        if (users && users.length > 0) {
          const productionRequestRepository = AppDataSource.getRepository(ProductionRequest);

          const userWorkloads = await Promise.all(users.map(async (user) => {
            const activeRequestsCount = await productionRequestRepository.count({
              where: {
                assignedUserId: user.id,
                status: Not(In(['completed', 'cancelled']))
              }
            });
            return { user, count: activeRequestsCount };
          }));

          userWorkloads.sort((a, b) => a.count - b.count);

          const minWorkload = userWorkloads[0].count;
          const candidates = userWorkloads.filter(uw => uw.count === minWorkload);

          const randomIndex = Math.floor(Math.random() * candidates.length);
          const selectedCandidate = candidates[randomIndex];

          return {
            assignedUserId: selectedCandidate.user.id,
            userName: selectedCandidate.user.name,
            activeRequestsCount: selectedCandidate.count
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Error in smart assignment:', error);
      return null;
    }
  }

  /**
   * Resuelve el usuario asignado para un equipo específico en flujos dinámicos,
   * según la estrategia configurada (random, workload, first, leader).
   */
  async resolveTeamUser(
    manager: any,
    teamId: number,
    strategy: 'random' | 'workload' | 'first' | 'leader' = 'random',
    excludeLeader: boolean = false,
    previousActionerId?: number
  ): Promise<number> {
    const team = await manager.getRepository(Team).findOne({ where: { id: teamId } });

    if (strategy === 'leader') {
      if (team && team.leaderId) {
        const leaderUser = await manager.getRepository(User).findOne({ where: { id: team.leaderId, status: 1 } });
        if (leaderUser) {
          return leaderUser.id;
        }
      }
    }

    const teamUsers = await manager.getRepository(User).find({
      where: { teamId, status: 1 }
    });
    if (!teamUsers || teamUsers.length === 0) return 1;

    // If excludeLeader is requested, filter out the team leader and/or previous actioner
    let candidates = teamUsers;
    if (excludeLeader) {
      const leaderUserId = team?.leaderId || previousActionerId;
      const filtered = teamUsers.filter((u: any) => u.id !== leaderUserId);
      if (filtered.length > 0) {
        candidates = filtered;
      }
    }

    if (strategy === 'random') {
      const randomIndex = Math.floor(Math.random() * candidates.length);
      return candidates[randomIndex].id;
    }
    if (strategy === 'first' || strategy === 'leader') {
      return candidates[0].id;
    }
    const stateRepo = manager.getRepository(DynamicSubmissionWorkflowState);
    const workloads = await Promise.all(candidates.map(async (u: any) => {
      const count = await stateRepo.count({
        where: { assignedUserId: u.id, status: 'Pending' }
      });
      return { userId: u.id, count };
    }));
    workloads.sort((a: any, b: any) => a.count - b.count);
    return workloads[0].userId;
  }
}

export const productionAssignmentService = new ProductionAssignmentService();

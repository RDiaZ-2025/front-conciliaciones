import { AppDataSource } from '../config/typeorm.config';
import { Team } from '../models/Team';
import { User } from '../models/User';
import { In, Not } from 'typeorm';

export class TeamService {
  private teamRepository = AppDataSource.getRepository(Team);
  private userRepository = AppDataSource.getRepository(User);

  /**
   * Get all teams with leader and default workflow
   */
  async getAllTeams(): Promise<Team[]> {
    return await this.teamRepository.find({
      relations: ['leader', 'defaultWorkflow', 'users'],
      order: {
        name: 'ASC'
      }
    });
  }

  /**
   * Get team by ID with relations
   */
  async getTeamById(id: number): Promise<Team | null> {
    return await this.teamRepository.findOne({
      where: { id },
      relations: ['leader', 'defaultWorkflow', 'users']
    });
  }

  /**
   * Create new team and sync bossId if leader is provided
   */
  async createTeam(data: Partial<Team>): Promise<Team> {
    const team = this.teamRepository.create({
      name: data.name,
      description: data.description,
      leaderId: data.leaderId || null,
      defaultWorkflowId: data.defaultWorkflowId || null,
      metadata: data.metadata !== undefined ? data.metadata : null
    });
    const savedTeam = await this.teamRepository.save(team);

    if (savedTeam.leaderId) {
      await this.syncTeamMembersBoss(savedTeam.id, savedTeam.leaderId);
    }

    return await this.getTeamById(savedTeam.id) || savedTeam;
  }

  /**
   * Get users by team ID
   */
  async getUsersByTeam(teamId: number): Promise<User[]> {
    return await this.userRepository.find({
      where: { teamId: teamId }
    });
  }

  /**
   * Update team and sync bossId if leader changed
   */
  async updateTeam(id: number, data: Partial<Team>): Promise<Team | null> {
    const team = await this.teamRepository.findOne({ where: { id } });
    if (!team) return null;

    const previousLeaderId = team.leaderId;
    const newLeaderId = data.leaderId !== undefined ? (data.leaderId || null) : team.leaderId;

    if (data.name !== undefined) team.name = data.name;
    if (data.description !== undefined) team.description = data.description;
    if (data.leaderId !== undefined) team.leaderId = data.leaderId || null;
    if (data.defaultWorkflowId !== undefined) team.defaultWorkflowId = data.defaultWorkflowId || null;
    if (data.metadata !== undefined) team.metadata = data.metadata || null;

    await this.teamRepository.save(team);

    // If leader changed or is set, synchronize team members' bossId
    if (newLeaderId && newLeaderId !== previousLeaderId) {
      await this.syncTeamMembersBoss(id, newLeaderId);
    }

    return await this.getTeamById(id);
  }

  /**
   * Helper to set bossId of all team members to the team's leader
   */
  private async syncTeamMembersBoss(teamId: number, leaderId: number): Promise<void> {
    // Set bossId = leaderId for all members of this team except the leader himself
    await this.userRepository.update(
      { teamId, id: Not(leaderId) },
      { bossId: leaderId }
    );
  }

  /**
   * Delete team
   */
  async deleteTeam(id: number): Promise<boolean> {
    // Unassign users from this team first
    await this.userRepository.update({ teamId: id }, { teamId: null });
    const result = await this.teamRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  /**
   * Update users in a team
   */
  async updateTeamUsers(teamId: number, userIds: number[]): Promise<void> {
    const team = await this.teamRepository.findOne({ where: { id: teamId } });
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const userRepo = queryRunner.manager.getRepository(User);

      if (userIds.length > 0) {
        // 1. Remove users no longer in this team
        await userRepo
          .createQueryBuilder()
          .update(User)
          .set({ teamId: null })
          .where("teamId = :teamId", { teamId })
          .andWhere("id NOT IN (:...userIds)", { userIds })
          .execute();

        // 2. Add/Update users in the list to this team
        await userRepo.update(
          { id: In(userIds) },
          { teamId: teamId }
        );

        // 3. If the team has a leader, automatically set bossId for non-leader members
        if (team && team.leaderId) {
          const nonLeaderIds = userIds.filter(uid => uid !== team.leaderId);
          if (nonLeaderIds.length > 0) {
            await userRepo.update(
              { id: In(nonLeaderIds) },
              { bossId: team.leaderId }
            );
          }
        }
      } else {
        // Remove all users from this team
        await userRepo.update(
          { teamId: teamId },
          { teamId: null }
        );
      }

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}

export const teamService = new TeamService();

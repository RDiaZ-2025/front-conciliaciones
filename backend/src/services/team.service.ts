import { AppDataSource } from '../config/typeorm.config';
import { Team } from '../models/Team';
import { User } from '../models/User';
import { In, Not } from 'typeorm';

export class TeamService {
  private teamRepository = AppDataSource.getRepository(Team);
  private userRepository = AppDataSource.getRepository(User);

  async getAllTeams(): Promise<Team[]> {
    return await this.teamRepository.find({
      relations: [
        'leader',
        'defaultWorkflow',
        'users',
        'subteams',
        'subteams.leader',
        'subteams.subteamUsers',
        'subteams.subteamUsers.user'
      ],
      order: {
        name: 'ASC'
      }
    });
  }

  async getTeamById(id: number): Promise<Team | null> {
    return await this.teamRepository.findOne({
      where: { id },
      relations: [
        'leader',
        'defaultWorkflow',
        'users',
        'subteams',
        'subteams.leader',
        'subteams.subteamUsers',
        'subteams.subteamUsers.user'
      ]
    });
  }

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

  async getUsersByTeam(teamId: number): Promise<User[]> {
    return await this.userRepository.find({
      where: { teamId: teamId }
    });
  }

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

    if (newLeaderId && newLeaderId !== previousLeaderId) {
      await this.syncTeamMembersBoss(id, newLeaderId);
    }

    return await this.getTeamById(id);
  }

  private async syncTeamMembersBoss(teamId: number, leaderId: number): Promise<void> {

    await this.userRepository.update(
      { teamId, id: Not(leaderId) },
      { bossId: leaderId }
    );
  }

  async deleteTeam(id: number): Promise<boolean> {

    await this.userRepository.update({ teamId: id }, { teamId: null });
    const result = await this.teamRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async updateTeamUsers(teamId: number, userIds: number[]): Promise<void> {
    const team = await this.teamRepository.findOne({ where: { id: teamId } });
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const userRepo = queryRunner.manager.getRepository(User);

      if (userIds.length > 0) {

        await userRepo
          .createQueryBuilder()
          .update(User)
          .set({ teamId: null })
          .where("teamId = :teamId", { teamId })
          .andWhere("id NOT IN (:...userIds)", { userIds })
          .execute();

        await userRepo.update(
          { id: In(userIds) },
          { teamId: teamId }
        );

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

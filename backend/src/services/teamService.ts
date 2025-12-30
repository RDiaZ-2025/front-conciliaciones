import { AppDataSource } from '../config/typeorm.config';
import { Team } from '../models/Team';
import { UserByTeam } from '../models/UserByTeam';
import { User } from '../models/User';

export class TeamService {
  private teamRepository = AppDataSource.getRepository(Team);
  private userByTeamRepository = AppDataSource.getRepository(UserByTeam);

  /**
   * Get all teams
   */
  async getAllTeams(): Promise<Team[]> {
    return await this.teamRepository.find({
      order: {
        name: 'ASC'
      }
    });
  }

  /**
   * Get team by ID
   */
  async getTeamById(id: number): Promise<Team | null> {
    return await this.teamRepository.findOne({
      where: { id }
    });
  }

  /**
   * Create new team
   */
  async createTeam(data: Partial<Team>): Promise<Team> {
    const team = this.teamRepository.create(data);
    return await this.teamRepository.save(team);
  }

  /**
   * Get users by team ID
   */
  async getUsersByTeam(teamId: number): Promise<User[]> {
    const userByTeams = await this.userByTeamRepository.find({
      where: { teamId },
      relations: ['user']
    });
    
    return userByTeams.map(ubt => ubt.user);
  }

  /**
   * Update team
   */
  async updateTeam(id: number, data: Partial<Team>): Promise<Team | null> {
    const team = await this.getTeamById(id);
    if (!team) return null;
    
    Object.assign(team, data);
    return await this.teamRepository.save(team);
  }

  /**
   * Delete team
   */
  async deleteTeam(id: number): Promise<boolean> {
    const result = await this.teamRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  /**
   * Update users in a team
   */
  async updateTeamUsers(teamId: number, userIds: number[]): Promise<void> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const userByTeamRepo = queryRunner.manager.getRepository(UserByTeam);
      
      // Delete existing
      await userByTeamRepo.delete({ teamId });

      // Add new
      if (userIds.length > 0) {
        const links = userIds.map(userId => {
          const link = new UserByTeam();
          link.teamId = teamId;
          link.userId = userId;
          return link;
        });

        await userByTeamRepo.save(links);
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

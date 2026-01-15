import { AppDataSource } from '../config/typeorm.config';
import { Team } from '../models/Team';
import { User } from '../models/User';
import { In } from 'typeorm';

export class TeamService {
  private teamRepository = AppDataSource.getRepository(Team);
  private userRepository = AppDataSource.getRepository(User);

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
    return await this.userRepository.find({
      where: { teamId: teamId }
    });
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
   * Sets the teamId for the specified users to this team.
   * Note: This implementation assumes we want to ADD/UPDATE these users to this team.
   * If the intention is to make the team contain ONLY these users, we need to handle removals too.
   * Given "One User -> One Team", if a user is moved to this team, they are automatically removed from their old team.
   * Users previously in this team but NOT in userIds will REMAIN in this team unless explicitly moved elsewhere or set to null.
   * However, usually "update users in a team" implies "these are the users of the team".
   * So we should probably set teamId=null for users currently in the team who are not in the new list.
   */
  async updateTeamUsers(teamId: number, userIds: number[]): Promise<void> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const userRepo = queryRunner.manager.getRepository(User);

      // 1. Remove users who are currently in this team but not in the new list
      // If userIds is empty, remove all users from this team
      if (userIds.length > 0) {
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

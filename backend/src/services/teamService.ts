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
}

export const teamService = new TeamService();

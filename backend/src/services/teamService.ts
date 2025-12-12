import { AppDataSource } from '../config/typeorm.config';
import { Team } from '../models/Team';

export class TeamService {
  private teamRepository = AppDataSource.getRepository(Team);

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
}

export const teamService = new TeamService();

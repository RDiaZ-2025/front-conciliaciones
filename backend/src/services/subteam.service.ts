import { AppDataSource } from '../config/typeorm.config';
import { Subteam } from '../models/Subteam';
import { SubteamUser } from '../models/SubteamUser';
import { User } from '../models/User';
import { In } from 'typeorm';

export interface CreateSubteamDTO {
  name: string;
  description?: string | null;
  leaderId?: number | null;
  userIds?: number[];
}

export interface UpdateSubteamDTO {
  name?: string;
  description?: string | null;
  leaderId?: number | null;
  isActive?: boolean;
  userIds?: number[];
}

export class SubteamService {
  private subteamRepo = AppDataSource.getRepository(Subteam);
  private subteamUserRepo = AppDataSource.getRepository(SubteamUser);
  private userRepo = AppDataSource.getRepository(User);

  async getSubteamsByTeam(teamId: number): Promise<Subteam[]> {
    return await this.subteamRepo.find({
      where: { teamId },
      relations: ['leader', 'subteamUsers', 'subteamUsers.user'],
      order: { name: 'ASC' }
    });
  }

  async getSubteamById(id: number): Promise<Subteam | null> {
    return await this.subteamRepo.findOne({
      where: { id },
      relations: ['team', 'leader', 'subteamUsers', 'subteamUsers.user']
    });
  }

  async createSubteam(teamId: number, data: CreateSubteamDTO): Promise<Subteam> {
    const subteam = this.subteamRepo.create({
      teamId,
      name: data.name,
      description: data.description || null,
      leaderId: data.leaderId || null,
      isActive: true
    });

    const saved = await this.subteamRepo.save(subteam);

    if (data.userIds && data.userIds.length > 0) {
      await this.updateSubteamUsers(saved.id, data.userIds);
    }

    return (await this.getSubteamById(saved.id)) || saved;
  }

  async updateSubteam(id: number, data: UpdateSubteamDTO): Promise<Subteam | null> {
    const subteam = await this.subteamRepo.findOne({ where: { id } });
    if (!subteam) return null;

    if (data.name !== undefined) subteam.name = data.name;
    if (data.description !== undefined) subteam.description = data.description || null;
    if (data.leaderId !== undefined) subteam.leaderId = data.leaderId || null;
    if (data.isActive !== undefined) subteam.isActive = data.isActive;

    await this.subteamRepo.save(subteam);

    if (data.userIds !== undefined) {
      await this.updateSubteamUsers(id, data.userIds);
    }

    return await this.getSubteamById(id);
  }

  async deleteSubteam(id: number): Promise<boolean> {
    const result = await this.subteamRepo.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async getSubteamUsers(subteamId: number): Promise<User[]> {
    const relations = await this.subteamUserRepo.find({
      where: { subteamId },
      relations: ['user', 'user.team']
    });
    return relations.map(r => r.user).filter(Boolean);
  }

  async updateSubteamUsers(subteamId: number, userIds: number[]): Promise<void> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const subUserRepo = queryRunner.manager.getRepository(SubteamUser);

      // Remove existing not in userIds
      if (userIds.length > 0) {
        await subUserRepo
          .createQueryBuilder()
          .delete()
          .from(SubteamUser)
          .where('subteamId = :subteamId', { subteamId })
          .andWhere('userId NOT IN (:...userIds)', { userIds })
          .execute();

        // Existing user IDs
        const current = await subUserRepo.find({ where: { subteamId } });
        const currentIds = new Set(current.map(c => c.userId));

        const toAdd = userIds.filter(id => !currentIds.has(id));
        for (const userId of toAdd) {
          const entry = subUserRepo.create({
            subteamId,
            userId,
            assignedAt: new Date()
          });
          await subUserRepo.save(entry);
        }
      } else {
        await subUserRepo.delete({ subteamId });
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Obtiene un usuario activo aleatorio perteneciente al subequipo
   */
  async getRandomSubteamMember(subteamId: number): Promise<User | null> {
    const subteamUsers = await this.subteamUserRepo.find({
      where: { subteamId },
      relations: ['user']
    });

    const activeUsers = subteamUsers
      .map(su => su.user)
      .filter((u): u is User => !!u && (u.status === 1 || u.status === undefined || u.status === null));

    if (activeUsers.length === 0) {
      // Si no hay miembros activos, intentar retornar el líder si existe y está activo
      const subteam = await this.subteamRepo.findOne({
        where: { id: subteamId },
        relations: ['leader']
      });
      if (subteam?.leader && (subteam.leader.status === 1 || subteam.leader.status === undefined)) {
        return subteam.leader;
      }
      return null;
    }

    const randomIndex = Math.floor(Math.random() * activeUsers.length);
    return activeUsers[randomIndex];
  }
}

export const subteamService = new SubteamService();

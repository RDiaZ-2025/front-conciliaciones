import { AppDataSource } from '../config/typeorm.config';
import { Role } from '../models/Role';

export class RoleService {
  static async getAllRoles(): Promise<Role[]> {
    if (!AppDataSource.isInitialized) {
      throw new Error('Base de datos no disponible');
    }

    const roleRepository = AppDataSource.getRepository(Role);
    return roleRepository.find({
      order: { name: 'ASC' },
      relations: ['permissions']
    });
  }

  static async getRoleById(id: number): Promise<Role | null> {
    if (!AppDataSource.isInitialized) {
      throw new Error('Base de datos no disponible');
    }

    const roleRepository = AppDataSource.getRepository(Role);
    return roleRepository.findOne({
      where: { id },
      relations: ['permissions']
    });
  }
}


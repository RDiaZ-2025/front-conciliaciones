import { AppDataSource } from '../config/typeorm.config';
import { Permission } from '../models/Permission';

export class PermissionService {
    private permissionRepository = AppDataSource.getRepository(Permission);

    async getAllPermissions(): Promise<Permission[]> {
        return this.permissionRepository.find({
            order: { name: 'ASC' }
        });
    }

    async getPermissionById(id: number): Promise<Permission | null> {
        return this.permissionRepository.findOne({ where: { id } });
    }

    async createPermission(data: Partial<Permission>): Promise<Permission> {
        const permission = this.permissionRepository.create(data);
        return this.permissionRepository.save(permission);
    }

    async updatePermission(id: number, data: Partial<Permission>): Promise<Permission | null> {
        const permission = await this.permissionRepository.findOne({ where: { id } });
        if (!permission) {
            return null;
        }
        this.permissionRepository.merge(permission, data);
        return this.permissionRepository.save(permission);
    }

    async deletePermission(id: number): Promise<boolean> {
        const result = await this.permissionRepository.delete(id);
        return result.affected !== 0;
    }
}

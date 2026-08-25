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

    private normalizeName(name: string): string {
        return name.trim().toLowerCase().replace(/[\s_-]/g, '');
    }

    async createPermission(data: Partial<Permission>): Promise<Permission> {
        if (!data.name || !data.name.trim()) {
            throw new Error('El nombre del permiso es obligatorio');
        }
        const trimmedName = data.name.trim();
        const normalized = this.normalizeName(trimmedName);

        const allPermissions = await this.permissionRepository.find();
        const duplicate = allPermissions.find(p => this.normalizeName(p.name) === normalized);
        if (duplicate) {
            throw new Error(`Ya existe un permiso similar con el nombre "${duplicate.name}"`);
        }

        const permission = this.permissionRepository.create({
            ...data,
            name: trimmedName
        });
        return this.permissionRepository.save(permission);
    }

    async updatePermission(id: number, data: Partial<Permission>): Promise<Permission | null> {
        const permission = await this.permissionRepository.findOne({ where: { id } });
        if (!permission) {
            return null;
        }

        if (data.name) {
            const trimmedName = data.name.trim();
            if (!trimmedName) {
                throw new Error('El nombre del permiso no puede estar vacío');
            }
            const normalized = this.normalizeName(trimmedName);

            const allPermissions = await this.permissionRepository.find();
            const duplicate = allPermissions.find(p => p.id !== id && this.normalizeName(p.name) === normalized);
            if (duplicate) {
                throw new Error(`Ya existe un permiso similar con el nombre "${duplicate.name}"`);
            }
            data.name = trimmedName;
        }

        this.permissionRepository.merge(permission, data);
        return this.permissionRepository.save(permission);
    }

    async deletePermission(id: number): Promise<boolean> {
        const result = await this.permissionRepository.delete(id);
        return result.affected !== 0;
    }
}

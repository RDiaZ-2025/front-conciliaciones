import bcrypt from 'bcryptjs';
import { User, Permission, PermissionByUser, Team } from '../models';
import { AppDataSource } from '../config/typeorm.config';
import { In } from 'typeorm';

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  permissions?: string[];
  teamId?: number;
  bossId?: number;
}

export interface CreateUserResponse {
  success: boolean;
  user?: {
    id: number;
    name: string;
    email: string;
    permissions: string[];
    teamId?: number;
    bossId?: number;
  };
  message?: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
  permissions?: string[];
  status?: number;
  teamId?: number | null;
  bossId?: number | null;
}

import { UserResponseDTO } from '../types';

export class UserService {
  private readonly SALT_ROUNDS = 12;

  // Crear nuevo usuario
  async createUser(userData: CreateUserRequest): Promise<CreateUserResponse> {
    if (!AppDataSource.isInitialized) {
      return {
        success: false,
        message: 'Base de datos no disponible'
      };
    }

    const userRepository = AppDataSource.getRepository(User);
    const permissionRepository = AppDataSource.getRepository(Permission);
    const permissionByUserRepository = AppDataSource.getRepository(PermissionByUser);

    // Verificar si el email ya existe
    const existingUser = await userRepository.findOne({
      where: { email: userData.email }
    });

    if (existingUser) {
      return {
        success: false,
        message: 'El email ya está registrado'
      };
    }

    // Hash de la contraseña
    const passwordHash = await bcrypt.hash(userData.password, this.SALT_ROUNDS);

    // Crear el usuario
    const newUser = userRepository.create({
      name: userData.name,
      email: userData.email,
      passwordHash: passwordHash,
      status: 1,
      role: (userData as any).role || 'user',
      permissionsStr: userData.permissions ? userData.permissions.join(',') : ''
    });

    const savedUser = await userRepository.save(newUser);

    // Asignar permisos si se proporcionaron
    const assignedPermissions: string[] = [];
    if (userData.permissions && userData.permissions.length > 0) {
      for (const permissionName of userData.permissions) {
        try {
          // Buscar el permiso (sin convertir a mayúsculas, usar el nombre tal como está)
          const permission = await permissionRepository.findOne({
            where: { name: permissionName }
          });

          if (permission) {
            // Asignar el permiso al usuario
            const permissionByUser = permissionByUserRepository.create({
              userId: savedUser.id,
              permissionId: permission.id,
              assignedAt: new Date()
            });

            await permissionByUserRepository.save(permissionByUser);
            assignedPermissions.push(permissionName);
          } else {
            console.warn(`[PERMISSION WARNING] No se encontró el permiso '${permissionName}' en la tabla PERMISSIONS.`);
          }
        } catch (permError) {
          console.error(`[PERMISSION ERROR] No se pudo asignar el permiso '${permissionName}':`, permError);
        }
      }
    }

    // Asignar equipo si se proporcionó
    if (userData.teamId) {
      savedUser.teamId = userData.teamId;
    }

    // Asignar jefe si se proporcionó
    if (userData.bossId) {
      savedUser.bossId = userData.bossId;
    }

    // Guardar nuevamente si hubo cambios de relaciones
    if (userData.teamId || userData.bossId) {
      await userRepository.save(savedUser);
    }

    return {
      success: true,
      user: {
        id: savedUser.id,
        name: savedUser.name,
        email: savedUser.email,
        permissions: assignedPermissions,
        teamId: savedUser.teamId || undefined,
        bossId: savedUser.bossId || undefined
      },
      message: 'Usuario creado exitosamente'
    };
  }

  // Obtener todos los usuarios
  async getAllUsers(): Promise<UserResponseDTO[]> {
    if (!AppDataSource.isInitialized) {
      throw new Error('Base de datos no disponible');
    }

    const userRepository = AppDataSource.getRepository(User);

    // Obtener todos los usuarios con sus permisos y equipos en una sola consulta
    const users = await userRepository.find({
      order: { name: 'ASC' },
      relations: ['permissions', 'permissions.permission', 'team', 'boss']
    });

    // Mapear a la respuesta deseada
    const usersWithDetails = users.map(user => {
      const permissions = user.permissions
        ? user.permissions.map(up => up.permission.name)
        : [];

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        lastAccess: user.lastAccess,
        status: user.status,
        permissions,
        teamId: user.teamId,
        teamName: user.team?.name,
        bossId: user.bossId,
        bossName: user.boss?.name
      };
    });

    return usersWithDetails;
  }

  // Obtener usuario por ID
  async getUserById(userId: number): Promise<UserResponseDTO | null> {
    if (!AppDataSource.isInitialized) {
      return null;
    }

    const userRepository = AppDataSource.getRepository(User);

    // Buscar el usuario por ID y status activo
    const user = await userRepository.findOne({
      where: { id: userId, status: 1 },
      relations: ['team', 'boss', 'permissions', 'permissions.permission']
    });

    if (!user) {
      return null;
    }

    const permissions = user.permissions?.map((p: PermissionByUser) => p.permission.name) || [];

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      lastAccess: user.lastAccess,
      status: user.status,
      permissions: permissions,
      teamId: user.teamId,
      teamName: user.team?.name || null,
      bossId: user.bossId,
      bossName: user.boss?.name || null
    };
  }

  // Actualizar usuario
  async updateUser(userId: number, updateData: UpdateUserRequest): Promise<{ success: boolean; message?: string }> {
    if (!AppDataSource.isInitialized) {
      return {
        success: false,
        message: 'Base de datos no disponible'
      };
    }

    const userRepository = AppDataSource.getRepository(User);
    const permissionRepository = AppDataSource.getRepository(Permission);
    const permissionByUserRepository = AppDataSource.getRepository(PermissionByUser);

    // Buscar el usuario
    const user = await userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      return {
        success: false,
        message: 'Usuario no encontrado'
      };
    }

    // Actualizar campos del usuario
    if (updateData.name) {
      user.name = updateData.name;
    }

    if (updateData.email) {
      user.email = updateData.email;
    }

    if (updateData.password) {
      const passwordHash = await bcrypt.hash(updateData.password, this.SALT_ROUNDS);
      user.passwordHash = passwordHash;
    }

    if (updateData.status !== undefined) {
      user.status = updateData.status;
    }

    if ((updateData as any).role !== undefined) {
      user.role = (updateData as any).role;
    }

    if (updateData.permissions !== undefined) {
      user.permissionsStr = updateData.permissions.join(',');
    }

    // Guardar cambios del usuario
    await userRepository.save(user);

    // Actualizar permisos si se proporcionaron
    if (updateData.permissions && updateData.permissions.length > 0) {
      // Eliminar permisos existentes
      await permissionByUserRepository.delete({ userId: userId });

      const permissions = await permissionRepository.find({
        where: { name: In(updateData.permissions) }
      });

      const newPermissions = permissions.map(permission => {
        const permissionByUser = new PermissionByUser();
        permissionByUser.userId = user.id;
        permissionByUser.permissionId = permission.id;
        return permissionByUser;
      });

      if (newPermissions.length > 0) {
        await permissionByUserRepository.save(newPermissions);
      }
    } else if (updateData.permissions && updateData.permissions.length === 0) {
      await permissionByUserRepository.delete({ userId: userId });
    }

    // Actualizar equipo si se proporcionó (aunque sea null)
    if (updateData.teamId !== undefined) {
      // Asignar nuevo equipo si no es null
      user.teamId = updateData.teamId;
    }

    // Actualizar jefe si se proporcionó (aunque sea null)
    if (updateData.bossId !== undefined) {
      user.bossId = updateData.bossId;
    }

    await userRepository.save(user);

    return {
      success: true,
      message: 'Usuario actualizado exitosamente'
    };
  }

  async toggleUserStatus(userId: number): Promise<{ success: boolean; message?: string; newStatus?: number }> {
    if (!AppDataSource.isInitialized) {
      return {
        success: false,
        message: 'Base de datos no disponible'
      };
    }

    const userRepository = AppDataSource.getRepository(User);

    // Buscar el usuario
    const user = await userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      return {
        success: false,
        message: 'Usuario no encontrado'
      };
    }

    // Cambiar el estado
    const newStatus = user.status === 1 ? 0 : 1;
    user.status = newStatus;

    await userRepository.save(user);

    return {
      success: true,
      message: `Usuario ${newStatus === 1 ? 'habilitado' : 'deshabilitado'} exitosamente`,
      newStatus
    };
  }

  async getAllPermissions(): Promise<Permission[]> {
    if (!AppDataSource.isInitialized) {
      throw new Error('Base de datos no disponible');
    }
    const permissionRepository = AppDataSource.getRepository(Permission);
    return permissionRepository.find();
  }

  async updateUserPermissions(userId: number, permissions: string[]): Promise<boolean> {

    if (!AppDataSource.isInitialized) {
      throw new Error('Base de datos no disponible');
    }

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const permissionByUserRepository = queryRunner.manager.getRepository(PermissionByUser);
      const permissionRepository = queryRunner.manager.getRepository(Permission);

      await permissionByUserRepository.delete({ userId });

      if (permissions && permissions.length > 0) {
        for (const permissionName of permissions) {
          const permission = await permissionRepository.findOne({
            where: { name: permissionName.toUpperCase() }
          });

          if (permission) {
            const permissionByUser = new PermissionByUser();
            permissionByUser.userId = userId;
            permissionByUser.permissionId = permission.id;

            await permissionByUserRepository.save(permissionByUser);
          }
        }
      }

      await queryRunner.commitTransaction();
      return true;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

  }

  // Eliminar usuario
  async deleteUser(userId: number): Promise<{ success: boolean; message?: string }> {
    if (!AppDataSource.isInitialized) {
      return {
        success: false,
        message: 'Base de datos no disponible'
      };
    }

    const userRepository = AppDataSource.getRepository(User);
    const permissionByUserRepository = AppDataSource.getRepository(PermissionByUser);

    const user = await userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      return {
        success: false,
        message: 'Usuario no encontrado'
      };
    }

    // Eliminar permisos asociados
    await permissionByUserRepository.delete({ userId: userId });

    // Eliminar usuario
    await userRepository.remove(user);

    return {
      success: true,
      message: 'Usuario eliminado exitosamente'
    };
  }
}
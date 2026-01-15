import bcrypt from 'bcryptjs';
import { User, Permission, PermissionByUser } from '../models';
import { AppDataSource } from '../config/typeorm.config';

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  permissions?: string[];
}

export interface CreateUserResponse {
  success: boolean;
  user?: {
    id: number;
    name: string;
    email: string;
    permissions: string[];
  };
  message?: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
  permissions?: string[];
  status?: number;
}

export class UserService {
  private static readonly SALT_ROUNDS = 12;

  // Crear nuevo usuario
  static async createUser(userData: CreateUserRequest): Promise<CreateUserResponse> {
    try {
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
        status: 1
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

      return {
        success: true,
        user: {
          id: savedUser.id,
          name: savedUser.name,
          email: savedUser.email,
          permissions: assignedPermissions
        },
        message: 'Usuario creado exitosamente'
      };
    } catch (error) {
      console.error('❌ Error creating user in database:', error);
      return {
        success: false,
        message: 'Error al crear el usuario en la base de datos'
      };
    }
  }

  // Obtener todos los usuarios
  static async getAllUsers(): Promise<any[]> {
    try {
      if (!AppDataSource.isInitialized) {
        throw new Error('Base de datos no disponible');
      }

      const userRepository = AppDataSource.getRepository(User);
      const permissionByUserRepository = AppDataSource.getRepository(PermissionByUser);

      // Obtener todos los usuarios con sus permisos en una sola consulta
      const users = await userRepository.find({
        order: { name: 'ASC' },
        relations: ['permissions', 'permissions.permission']
      });

      // Mapear a la respuesta deseada
      const usersWithPermissions = users.map(user => {
        const permissions = user.permissions
          ? user.permissions.map(up => up.permission.name)
          : [];

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          lastAccess: user.lastAccess,
          status: user.status,
          permissions
        };
      });

      return usersWithPermissions;
    } catch (error) {
      console.error('❌ Error getting users:', error);
      throw error;
    }
  }

  // Obtener usuario por ID
  static async getUserById(userId: number): Promise<any | null> {
    try {
      if (!AppDataSource.isInitialized) {
        return null;
      }

      const userRepository = AppDataSource.getRepository(User);
      const permissionByUserRepository = AppDataSource.getRepository(PermissionByUser);

      // Buscar el usuario por ID y status activo
      const user = await userRepository.findOne({
        where: { id: userId, status: 1 }
      });

      if (!user) {
        return null;
      }

      // Obtener permisos del usuario
      const userPermissions = await permissionByUserRepository.find({
        where: { userId: user.id },
        relations: ['permission']
      });

      const directPermissions = userPermissions.map(up => up.permission.name);

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        lastAccess: user.lastAccess,
        status: user.status,
        permissions: directPermissions
      };
    } catch (error) {
      console.error('❌ Error getting user by ID:', error);
      return null;
    }
  }

  // Actualizar usuario
  static async updateUser(userId: number, updateData: UpdateUserRequest): Promise<{ success: boolean; message?: string }> {
    try {
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

      // Guardar cambios del usuario
      await userRepository.save(user);

      // Actualizar permisos si se proporcionaron
      if (updateData.permissions) {
        // Eliminar permisos existentes
        await permissionByUserRepository.delete({ userId: userId });

        // Asignar nuevos permisos
        for (const permissionName of updateData.permissions) {
          try {
            const permission = await permissionRepository.findOne({
              where: { name: permissionName }
            });

            if (permission) {
              const permissionByUser = permissionByUserRepository.create({
                userId: userId,
                permissionId: permission.id,
                assignedAt: new Date()
              });

              await permissionByUserRepository.save(permissionByUser);
            }
          } catch (permError) {
            console.warn(`Warning: Could not assign permission ${permissionName}:`, permError);
          }
        }
      }

      return {
        success: true,
        message: 'Usuario actualizado exitosamente'
      };
    } catch (error) {
      console.error('❌ Error updating user:', error);
      return {
        success: false,
        message: 'Error al actualizar el usuario'
      };
    }
  }

  // Cambiar estado de usuario (habilitar/deshabilitar)
  static async toggleUserStatus(userId: number): Promise<{ success: boolean; message?: string; newStatus?: number }> {
    try {
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
    } catch (error) {
      console.error('❌ Error cambiando estado del usuario:', error);
      return {
        success: false,
        message: 'Error al cambiar estado del usuario'
      };
    }
  }
}
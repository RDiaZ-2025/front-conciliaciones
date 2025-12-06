import { Request, Response } from 'express';
import { User, Permission, PermissionByUser } from '../models';
import { AppDataSource } from '../config/typeorm.config';
import bcrypt from 'bcrypt';
import { UserService } from '../services/userService';

export class UserController {
  static async getUsers(req: Request, res: Response): Promise<void> {
    try {
      if (!AppDataSource.isInitialized) {
        res.status(503).json({
          success: false,
          message: 'Base de datos no disponible'
        });
        return;
      }
      
      // Usar el servicio de usuarios que ya tiene la lógica corregida
      const users = await UserService.getAllUsers();

      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.status(200).json({
        success: true,
        data: users
      });
    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  static async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!AppDataSource.isInitialized) {
        res.status(503).json({
          success: false,
          message: 'Base de datos no disponible'
        });
        return;
      }
      
      const userRepository = AppDataSource.getRepository(User);
      
      const user = await userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.permissionsByUser', 'permissionsByUser')
        .leftJoinAndSelect('permissionsByUser.permission', 'permission')
        .where('user.id = :userId AND user.status = :status', { userId: parseInt(id), status: 1 })
        .getOne();

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
        return;
      }

      const permissions = user.permissions?.map((pbu: any) => pbu.permission?.name).filter(Boolean) || [];

      res.status(200).json({
        success: true,
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          lastAccess: user.lastAccess,
          status: user.status,
          permissions
        }
      });
    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  static async updateUserPermissions(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { permissions } = req.body;

      if (!AppDataSource.isInitialized) {
        res.status(503).json({
          success: false,
          message: 'Base de datos no disponible'
        });
        return;
      }

      const queryRunner = AppDataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const permissionByUserRepository = queryRunner.manager.getRepository(PermissionByUser);
        const permissionRepository = queryRunner.manager.getRepository(Permission);

        // Eliminar permisos existentes
        await permissionByUserRepository.delete({ userId: parseInt(id) });

        // Agregar nuevos permisos
        if (permissions && permissions.length > 0) {
          for (const permissionName of permissions) {
            // Obtener el permiso por nombre
            const permission = await permissionRepository.findOne({
              where: { name: permissionName.toUpperCase() }
            });

            if (permission) {
              const permissionByUser = new PermissionByUser();
              permissionByUser.userId = parseInt(id);
              permissionByUser.permissionId = permission.id;
              
              await permissionByUserRepository.save(permissionByUser);
            }
          }
        }

        await queryRunner.commitTransaction();

        res.status(200).json({
          success: true,
          message: 'Permisos actualizados correctamente'
        });
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      console.error('Error actualizando permisos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  static async createUser(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password, permissions = [] }: {
        name: string;
        email: string;
        password: string;
        permissions?: string[];
      } = req.body;

      // Validación básica
      if (!name || !email || !password) {
        res.status(400).json({
          success: false,
          message: 'Nombre, email y contraseña son requeridos'
        });
        return;
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          success: false,
          message: 'Formato de email inválido'
        });
        return;
      }

      const result = await UserService.createUser({
        name,
        email: email.toLowerCase(),
        password,
        permissions
      });

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('❌ Error creating user:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  static async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, email, password, permissions } = req.body;
      
      const result = await UserService.updateUser(parseInt(id), {
        name,
        email,
        password,
        permissions
      });

      if (result.success) {
        // Obtener el usuario actualizado y retornarlo
        const updatedUser = await UserService.getUserById(parseInt(id));
        res.status(200).json({ ...result, user: updatedUser });
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  static async toggleUserStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!AppDataSource.isInitialized) {
        res.status(503).json({
          success: false,
          message: 'Base de datos no disponible'
        });
        return;
      }

      const userRepository = AppDataSource.getRepository(User);

      // Verificar que el usuario existe
      const user = await userRepository.findOne({
      where: { id: parseInt(id) },
      select: ['id', 'status']
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
      return;
    }

    const currentStatus = user.status;
    const newStatus = currentStatus === 1 ? 0 : 1;

    await userRepository.update(
      { id: parseInt(id) },
      { status: newStatus }
    );

      res.status(200).json({
        success: true,
        message: `Usuario ${newStatus === 1 ? 'habilitado' : 'deshabilitado'} exitosamente`,
        newStatus
      });
    } catch (error) {
      console.error('Error cambiando estado del usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  static async getAllPermissions(req: Request, res: Response): Promise<void> {
    try {
      if (!AppDataSource.isInitialized) {
        console.error('Database not initialized in getAllPermissions');
        res.status(503).json({
          success: false,
          message: 'Base de datos no disponible'
        });
        return;
      }

      const permissionRepository = AppDataSource.getRepository(Permission);

      const permissions = await permissionRepository.find({
        order: { name: 'ASC' }
      });

      res.status(200).json({
        success: true,
        data: permissions.map(permission => ({
          id: permission.id,
          name: permission.name,
          description: permission.description
        }))
      });
    } catch (error) {
      console.error('Error obteniendo permisos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }
}
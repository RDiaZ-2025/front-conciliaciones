import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { LoginRequest } from '../types';
import bcrypt from 'bcrypt';
import { User, Permission, PermissionByUser } from '../models';
import { AppDataSource } from '../config/typeorm.config';

export class AuthController {
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password }: LoginRequest = req.body;

      // Validación básica
      if (!email || !password) {
        res.status(400).json({
          success: false,
          message: 'Email y contraseña son requeridos'
        });
        return;
      }

      const result = await AuthService.login({ email, password });

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(401).json(result);
      }
    } catch (error) {
      console.error('Error en login controller:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  static async me(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'No autenticado'
        });
        return;
      }

      // Obtener usuario de la base de datos
      const user = await AuthService.getUserById(req.user.userId);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
        return;
      }

      // Obtener permisos del usuario
      const permissions = await AuthService.getUserPermissions(req.user.userId);

      res.status(200).json({
        success: true,
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          permissions: permissions,
          lastAccess: user.lastAccess
        }
      });
      return;
    } catch (error) {
      console.error('Error en me controller:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  static async initializeUsers(req: Request, res: Response): Promise<void> {
    try {
      if (!AppDataSource.isInitialized) {
        res.status(500).json({
          success: false,
          message: 'Base de datos no disponible'
        });
        return;
      }

      // Hash de la contraseña 'admin123', 'manager123', 'user123', etc.
      const passwordHash = await bcrypt.hash('admin123', 12);
      const managerHash = await bcrypt.hash('manager123', 12);
      const userHash = await bcrypt.hash('user123', 12);
      const uploadHash = await bcrypt.hash('upload123', 12);
      const dashboardHash = await bcrypt.hash('dashboard123', 12);

      const queryRunner = AppDataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const userRepository = queryRunner.manager.getRepository(User);
        const permissionRepository = queryRunner.manager.getRepository(Permission);
        const permissionByUserRepository = queryRunner.manager.getRepository(PermissionByUser);

        // Crear usuarios adicionales
        const users = [
          { name: 'Administrador Test', email: 'admin@test.com', hash: passwordHash, permissions: ['document_upload', 'management_dashboard', 'admin_panel'] },
          { name: 'Manager Test', email: 'manager@test.com', hash: managerHash, permissions: ['document_upload', 'management_dashboard'] },
          { name: 'Usuario Test', email: 'user@test.com', hash: userHash, permissions: ['management_dashboard'] },
          { name: 'Administrador Sistema Legacy', email: 'admin@claromedia.com', hash: passwordHash, permissions: ['document_upload', 'management_dashboard', 'admin_panel'] },
          { name: 'Usuario Carga Legacy', email: 'upload@claromedia.com', hash: uploadHash, permissions: ['document_upload'] },
          { name: 'Usuario Dashboard Legacy', email: 'dashboard@claromedia.com', hash: dashboardHash, permissions: ['management_dashboard'] }
        ];

        for (const userData of users) {
          // Verificar si el usuario ya existe
          const existingUser = await userRepository.findOne({
            where: { email: userData.email }
          });

          if (!existingUser) {
            // Crear usuario
            const newUser = userRepository.create({
              name: userData.name,
              email: userData.email,
              passwordHash: userData.hash,
              status: 1
            });

            const savedUser = await userRepository.save(newUser);

            // Asignar permisos
            for (const permissionName of userData.permissions) {
              const permission = await permissionRepository.findOne({
                where: { name: permissionName }
              });

              if (permission) {
                const permissionByUser = permissionByUserRepository.create({
                  userId: savedUser.id,
                  permissionId: permission.id
                });

                await permissionByUserRepository.save(permissionByUser);
              }
            }

          } else {

          }
        }

        await queryRunner.commitTransaction();

        res.status(200).json({
          success: true,
          message: 'Usuarios inicializados exitosamente',
          users: [
            'admin@claromedia.com / admin123 (Administrador completo)',
            'admin@test.com / admin123 (Administrador test)',
            'manager@test.com / manager123 (Manager)',
            'user@test.com / user123 (Usuario básico)',
            'upload@claromedia.com / upload123 (Solo carga)',
            'dashboard@claromedia.com / dashboard123 (Solo dashboard)'
          ]
        });
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      console.error('Error inicializando usuarios:', error);
      res.status(500).json({
        success: false,
        message: 'Error inicializando usuarios'
      });
    }
  }

  static async logout(req: Request, res: Response): Promise<void> {
    // En un sistema JWT stateless, el logout se maneja en el frontend
    // eliminando el token del almacenamiento local
    res.status(200).json({
      success: true,
      message: 'Logout exitoso'
    });
  }
}
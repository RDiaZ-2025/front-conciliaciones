import { Request, Response } from 'express';
import { User, Permission, PermissionByUser } from '../models';
import { AppDataSource } from '../config/typeorm.config';
import bcrypt from 'bcrypt';
import { UserService } from '../services/userService';
import { asyncHandler } from "../utils/asyncHandler";

export class UserController {
    private userService = new UserService();
  getUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!AppDataSource.isInitialized) {
            res.status(503).json({
              success: false,
              message: 'Base de datos no disponible'
            });
            return;
          }

          const users = await this.userService.getAllUsers();

          res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          res.set('Pragma', 'no-cache');
          res.set('Expires', '0');
          res.status(200).json({
            success: true,
            data: users
          });
    });

  getUserById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
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
            .leftJoinAndSelect('user.permissions', 'permissionsByUser')
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

          const permissions = user.permissions
            ?.map((pbu: any) => pbu.permission?.name)
            .filter((name: any): name is string => !!name) || [];

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
    });

  updateUserPermissions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
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

            await permissionByUserRepository.delete({ userId: parseInt(id) });

            if (permissions && permissions.length > 0) {
              for (const permissionName of permissions) {
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
    });

  createUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { name, email, password, permissions = [], teamId, bossId }: {
            name: string;
            email: string;
            password: string;
            permissions?: string[];
            teamId?: number;
            bossId?: number;
          } = req.body;

          if (!name || !email || !password) {
            res.status(400).json({
              success: false,
              message: 'Nombre, email y contraseña son requeridos'
            });
            return;
          }

          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            res.status(400).json({
              success: false,
              message: 'Formato de email inválido'
            });
            return;
          }

          const result = await this.userService.createUser({
            name,
            email: email.toLowerCase(),
            password,
            permissions,
            teamId,
            bossId
          });

          if (result.success) {
            res.status(201).json(result);
          } else {
            res.status(400).json(result);
          }
    });

  updateUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
          const { name, email, password, permissions, teamId, bossId } = req.body;

          const result = await this.userService.updateUser(parseInt(id), {
            name,
            email,
            password,
            permissions,
            teamId,
            bossId
          });

          if (result.success) {
            const updatedUser = await this.userService.getUserById(parseInt(id));
            res.status(200).json({ ...result, user: updatedUser });
          } else {
            res.status(400).json(result);
          }
    });

  toggleUserStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

          if (!AppDataSource.isInitialized) {
            res.status(503).json({
              success: false,
              message: 'Base de datos no disponible'
            });
            return;
          }

          const userRepository = AppDataSource.getRepository(User);

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
    });

  getAllPermissions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
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
    });
}
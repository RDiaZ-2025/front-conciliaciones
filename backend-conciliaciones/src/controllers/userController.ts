import { Request, Response } from 'express';
import { getPool, sql } from '../config/database';
import { User } from '../types';
import bcrypt from 'bcrypt';
import { UserService } from '../services/userService';

export class UserController {
  static async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const pool = getPool();
      
      if (!pool) {
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
      const pool = getPool();
      
      if (!pool) {
        res.status(503).json({
          success: false,
          message: 'Base de datos no disponible'
        });
        return;
      }
      
      const result = await pool.request()
        .input('userId', sql.Int, parseInt(id))
        .query(`
          SELECT 
            u.Id,
            u.Name,
            u.Email,
            u.LastAccess,
            u.Status,
            STRING_AGG(p.Name, ',') as Permissions
          FROM USERS u
          LEFT JOIN PERMISSIONS_BY_USER pbu ON u.Id = pbu.UserId
          LEFT JOIN PERMISSIONS p ON pbu.PermissionId = p.Id
          WHERE u.Id = @userId AND u.Status = 1
          GROUP BY u.Id, u.Name, u.Email, u.LastAccess, u.Status
        `);

      if (result.recordset.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
        return;
      }

      const user = result.recordset[0];
      res.status(200).json({
        success: true,
        data: {
          id: user.Id,
          name: user.Name,
          email: user.Email,
          lastAccess: user.LastAccess,
          status: user.Status,
          permissions: user.Permissions ? user.Permissions.split(',') : []
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
      const pool = getPool();

      if (!pool) {
        res.status(503).json({
          success: false,
          message: 'Base de datos no disponible'
        });
        return;
      }

      // Iniciar transacción
      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      try {
        // Eliminar permisos existentes
        await transaction.request()
          .input('userId', sql.Int, parseInt(id))
          .query('DELETE FROM PERMISSIONS_BY_USER WHERE UserId = @userId');

        // Agregar nuevos permisos
        if (permissions && permissions.length > 0) {
          for (const permissionName of permissions) {
            // Obtener ID del permiso
            const permResult = await transaction.request()
  .input('permissionName', sql.VarChar, permissionName.toUpperCase())
  .query('SELECT Id FROM PERMISSIONS WHERE UPPER(Name) = @permissionName');

            if (permResult.recordset.length > 0) {
              const permissionId = permResult.recordset[0].Id;
              
              await transaction.request()
                .input('userId', sql.Int, parseInt(id))
                .input('permissionId', sql.Int, permissionId)
                .query('INSERT INTO PERMISSIONS_BY_USER (UserId, PermissionId) VALUES (@userId, @permissionId)');
            }
          }
        }

        await transaction.commit();

        res.status(200).json({
          success: true,
          message: 'Permisos actualizados correctamente'
        });
      } catch (error) {
        await transaction.rollback();
        throw error;
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

      console.log('🔍 Creating user:', { name, email, permissions });

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
        console.log('✅ User created successfully:', result.user?.email);
        res.status(201).json(result);
      } else {
        console.log('❌ User creation failed:', result.message);
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
      const pool = getPool();

      if (!pool) {
        res.status(503).json({
          success: false,
          message: 'Base de datos no disponible'
        });
        return;
      }

      // Verificar que el usuario existe
      const existingUser = await pool.request()
        .input('userId', sql.Int, parseInt(id))
        .query('SELECT Id, Status FROM USERS WHERE Id = @userId');

      if (existingUser.recordset.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
        return;
      }

      const currentStatus = existingUser.recordset[0].Status;
      const newStatus = currentStatus === 1 ? 0 : 1;

      await pool.request()
        .input('userId', sql.Int, parseInt(id))
        .input('status', sql.Int, newStatus)
        .query('UPDATE USERS SET Status = @status WHERE Id = @userId');

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
      const pool = getPool();

      if (!pool) {
        res.status(503).json({
          success: false,
          message: 'Base de datos no disponible'
        });
        return;
      }

      const result = await pool.request().query(`
        SELECT Id, Name, Description
        FROM PERMISSIONS
        ORDER BY Name
      `);

      res.status(200).json({
        success: true,
        data: result.recordset.map(permission => ({
          id: permission.Id,
          name: permission.Name,
          description: permission.Description
        }))
      });
    } catch (error) {
      console.error('Error obteniendo permisos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}
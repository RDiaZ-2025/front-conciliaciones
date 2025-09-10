import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { LoginRequest } from '../types';
import bcrypt from 'bcrypt';
import { getPool, sql } from '../config/database';

export class AuthController {
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password }: LoginRequest = req.body;

      // Debug: Log de las credenciales recibidas
      console.log('🔍 Login attempt:', {
        email: email,
        passwordLength: password ? password.length : 0,
        hasEmail: !!email,
        hasPassword: !!password
      });

      // Validación básica
      if (!email || !password) {
        console.log('❌ Missing credentials');
        res.status(400).json({
          success: false,
          message: 'Email y contraseña son requeridos'
        });
        return;
      }

      const result = await AuthService.login({ email, password });
      console.log('🔐 Login result:', { success: result.success, email });

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

      console.log('🔍 Verificando usuario:', req.user);

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
      
      console.log('✅ Usuario de base de datos verificado:', req.user.email);
      res.status(200).json({
        success: true,
        data: {
          id: user.Id,
          name: user.Name,
          email: user.Email,
          permissions: permissions,
          lastAccess: user.LastAccess
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
      const pool = getPool();
      if (!pool) {
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

      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      try {
        // Crear usuarios adicionales
        const users = [
          { name: 'Administrador Test', email: 'admin@test.com', hash: passwordHash, permissions: ['document_upload', 'management_dashboard', 'admin_panel'] },
          { name: 'Manager Test', email: 'manager@test.com', hash: managerHash, permissions: ['document_upload', 'management_dashboard'] },
          { name: 'Usuario Test', email: 'user@test.com', hash: userHash, permissions: ['management_dashboard'] },
          { name: 'Administrador Sistema Legacy', email: 'admin@claromedia.com', hash: passwordHash, permissions: ['document_upload', 'management_dashboard', 'admin_panel'] },
          { name: 'Usuario Carga Legacy', email: 'upload@claromedia.com', hash: uploadHash, permissions: ['document_upload'] },
          { name: 'Usuario Dashboard Legacy', email: 'dashboard@claromedia.com', hash: dashboardHash, permissions: ['management_dashboard'] }
        ];

        for (const user of users) {
          // Verificar si el usuario ya existe
          const checkRequest = new sql.Request(transaction);
          const existingUser = await checkRequest
            .input('email', sql.VarChar, user.email)
            .query('SELECT Id FROM USERS WHERE Email = @email');

          if (existingUser.recordset.length === 0) {
            // Insertar usuario
            const insertRequest = new sql.Request(transaction);
            const result = await insertRequest
              .input('name', sql.VarChar, user.name)
              .input('email', sql.VarChar, user.email)
              .input('passwordHash', sql.VarChar, user.hash)
              .query('INSERT INTO USERS (Name, Email, PasswordHash, Status) OUTPUT INSERTED.Id VALUES (@name, @email, @passwordHash, 1)');

            const userId = result.recordset[0].Id;

            // Asignar permisos
            for (const permissionName of user.permissions) {
              const permRequest = new sql.Request(transaction);
              const permission = await permRequest
                .input('permissionName', sql.VarChar, permissionName)
                .query('SELECT Id FROM PERMISSIONS WHERE Name = @permissionName');

              if (permission.recordset.length > 0) {
                const permissionId = permission.recordset[0].Id;
                const assignRequest = new sql.Request(transaction);
                await assignRequest
                  .input('userId', sql.Int, userId)
                  .input('permissionId', sql.Int, permissionId)
                  .query('INSERT INTO PERMISSIONS_BY_USER (UserId, PermissionId) VALUES (@userId, @permissionId)');
              }
            }

            console.log(`✅ Usuario ${user.email} creado exitosamente`);
          } else {
            console.log(`ℹ️ Usuario ${user.email} ya existe`);
          }
        }

        await transaction.commit();

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
        await transaction.rollback();
        throw error;
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
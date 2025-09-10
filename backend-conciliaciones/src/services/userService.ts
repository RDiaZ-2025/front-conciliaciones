import bcrypt from 'bcryptjs';
import { getPool, sql } from '../config/database';
import { User } from '../types';

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
      const pool = getPool();
      
      if (!pool) {
        return {
          success: false,
          message: 'Base de datos no disponible'
        };
      }

      // Verificar si el email ya existe
      const existingUser = await pool.request()
        .input('email', sql.VarChar, userData.email)
        .query('SELECT Id FROM USERS WHERE Email = @email');

      if (existingUser.recordset.length > 0) {
        return {
          success: false,
          message: 'El email ya está registrado'
        };
      }

      // Hash de la contraseña
      const passwordHash = await bcrypt.hash(userData.password, this.SALT_ROUNDS);

      // Crear el usuario
      const userResult = await pool.request()
        .input('name', sql.VarChar, userData.name)
        .input('email', sql.VarChar, userData.email)
        .input('passwordHash', sql.VarChar, passwordHash)
        .input('status', sql.Int, 1)
        .query(`
          INSERT INTO USERS (Name, Email, PasswordHash, Status)
          OUTPUT INSERTED.Id, INSERTED.Name, INSERTED.Email, INSERTED.Status
          VALUES (@name, @email, @passwordHash, @status)
        `);

      const newUser = userResult.recordset[0];

      // Asignar permisos si se proporcionaron
      const assignedPermissions: string[] = [];
      if (userData.permissions && userData.permissions.length > 0) {
        for (const permissionName of userData.permissions) {
          try {
            // Buscar el ID del permiso (convertir a mayúsculas)
            const permissionResult = await pool.request()
              .input('permissionName', sql.VarChar, permissionName.toUpperCase())
              .query('SELECT Id FROM PERMISSIONS WHERE UPPER(Name) = @permissionName');

            console.log('[PERMISSION DEBUG]', {
              permissionName,
              permissionNameUpper: permissionName.toUpperCase(),
              permissionResult: permissionResult.recordset
            });

            if (permissionResult.recordset.length > 0) {
              const permissionId = permissionResult.recordset[0].Id;
              // Asignar el permiso al usuario
              await pool.request()
                .input('userId', sql.Int, newUser.Id)
                .input('permissionId', sql.Int, permissionId)
                .query(`
                  INSERT INTO PERMISSIONS_BY_USER (UserId, PermissionId, AssignedAt)
                  VALUES (@userId, @permissionId, GETDATE())
                `);
              assignedPermissions.push(permissionName);
            } else {
              console.warn(`[PERMISSION WARNING] No se encontró el permiso '${permissionName}' (mayúsculas: '${permissionName.toUpperCase()}') en la tabla PERMISSIONS.`);
            }
          } catch (permError) {
            console.error(`[PERMISSION ERROR] No se pudo asignar el permiso '${permissionName}':`, permError);
          }
        }
      }

      console.log('✅ User created in database:', {
        id: newUser.Id,
        name: newUser.Name,
        email: newUser.Email,
        permissions: assignedPermissions
      });

      return {
        success: true,
        user: {
          id: newUser.Id,
          name: newUser.Name,
          email: newUser.Email,
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
      const pool = getPool();
      
      if (!pool) {
        throw new Error('Base de datos no disponible');
      }

      const result = await pool.request().query(`
        SELECT 
          u.Id,
          u.Name,
          u.Email,
          u.LastAccess,
          u.Status
        FROM USERS u
        ORDER BY u.Name
      `);

      // Obtener permisos por separado para cada usuario
      const usersWithPermissions = [];
      for (const user of result.recordset) {
        const permissionsResult = await pool.request()
          .input('userId', sql.Int, user.Id)
          .query(`
            SELECT p.Name
            FROM PERMISSIONS p
            INNER JOIN PERMISSIONS_BY_USER pbu ON p.Id = pbu.PermissionId
            WHERE pbu.UserId = @userId
          `);
        
        usersWithPermissions.push({
          ...user,
          Permissions: permissionsResult.recordset.map(p => p.Name).join(',')
        });
      }

      return usersWithPermissions.map((user: any) => ({
        id: user.Id,
        name: user.Name,
        email: user.Email,
        lastAccess: user.LastAccess,
        status: user.Status,
        permissions: user.Permissions ? user.Permissions.split(',').filter((p: string) => p) : []
      }));
    } catch (error) {
      console.error('❌ Error getting users:', error);
      throw error;
    }
  }

  // Obtener usuario por ID
  static async getUserById(userId: number): Promise<any | null> {
    try {
      const pool = getPool();
      
      if (!pool) {
        return null;
      }

      const result = await pool.request()
        .input('userId', sql.Int, userId)
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
        return null;
      }

      const user = result.recordset[0];
      return {
        id: user.Id,
        name: user.Name,
        email: user.Email,
        lastAccess: user.LastAccess,
        status: user.Status,
        permissions: user.Permissions ? user.Permissions.split(',') : []
      };
    } catch (error) {
      console.error('❌ Error getting user by ID:', error);
      return null;
    }
  }

  // Actualizar usuario
  static async updateUser(userId: number, updateData: UpdateUserRequest): Promise<{ success: boolean; message?: string }> {
    try {
      const pool = getPool();
      
      if (!pool) {
        return {
          success: false,
          message: 'Base de datos no disponible'
        };
      }

      // Construir la consulta de actualización dinámicamente
      const updateFields: string[] = [];
      const request = pool.request().input('userId', sql.Int, userId);

      if (updateData.name) {
        updateFields.push('Name = @name');
        request.input('name', sql.VarChar, updateData.name);
      }

      if (updateData.email) {
        updateFields.push('Email = @email');
        request.input('email', sql.VarChar, updateData.email);
      }

      if (updateData.password) {
        const passwordHash = await bcrypt.hash(updateData.password, this.SALT_ROUNDS);
        updateFields.push('PasswordHash = @passwordHash');
        request.input('passwordHash', sql.VarChar, passwordHash);
      }

      if (updateData.status !== undefined) {
        updateFields.push('Status = @status');
        request.input('status', sql.Int, updateData.status);
      }

      if (updateFields.length > 0) {
        const query = `
          UPDATE USERS 
          SET ${updateFields.join(', ')}
          WHERE Id = @userId
        `;

        await request.query(query);
      }

      // Actualizar permisos si se proporcionaron
      if (updateData.permissions) {
        // Eliminar permisos existentes
        await pool.request()
          .input('userId', sql.Int, userId)
          .query('DELETE FROM PERMISSIONS_BY_USER WHERE UserId = @userId');

        // Asignar nuevos permisos
        for (const permissionName of updateData.permissions) {
          try {
            const permissionResult = await pool.request()
              .input('permissionName', sql.VarChar, permissionName.toUpperCase())
              .query('SELECT Id FROM PERMISSIONS WHERE UPPER(Name) = @permissionName');

            if (permissionResult.recordset.length > 0) {
              const permissionId = permissionResult.recordset[0].Id;
              await pool.request()
                .input('userId', sql.Int, userId)
                .input('permissionId', sql.Int, permissionId)
                .query(`
                  INSERT INTO PERMISSIONS_BY_USER (UserId, PermissionId)
                  VALUES (@userId, @permissionId)
                `);
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
      const pool = getPool();
      
      if (!pool) {
        return {
          success: false,
          message: 'Base de datos no disponible'
        };
      }

      // Obtener estado actual
      const result = await pool.request()
        .input('userId', sql.Int, userId)
        .query('SELECT Status FROM USERS WHERE Id = @userId');

      if (result.recordset.length === 0) {
        return {
          success: false,
          message: 'Usuario no encontrado'
        };
      }

      const currentStatus = result.recordset[0].Status;
      const newStatus = currentStatus === 1 ? 0 : 1;

      await pool.request()
        .input('userId', sql.Int, userId)
        .input('status', sql.Int, newStatus)
        .query('UPDATE USERS SET Status = @status WHERE Id = @userId');

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
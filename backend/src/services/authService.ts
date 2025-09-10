import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPool, sql } from '../config/database';
import { User, LoginRequest, LoginResponse, JWTPayload } from '../types';

// Servicio de autenticación usando base de datos

export class AuthService {
  private static readonly SALT_ROUNDS = 12;
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-for-development';
  private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

  static {
    // Debug: verificar que JWT_SECRET esté cargado
    if (!process.env.JWT_SECRET) {
      console.warn('⚠️ JWT_SECRET no encontrado en variables de entorno, usando fallback');
    } else {
      console.log('✅ JWT_SECRET cargado correctamente');
    }
  }

  static async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      console.log('🔍 Login attempt:', {
        email: credentials.email,
        passwordLength: credentials.password.length,
        hasEmail: !!credentials.email,
        hasPassword: !!credentials.password
      });
      
      const pool = getPool();
      
      if (!pool) {
        console.error('❌ Base de datos no disponible');
        return {
          success: false,
          message: 'Servicio de autenticación no disponible'
        };
      }
      
      console.log('🔄 Using database for authentication');
      const result = await this.loginWithDatabase(credentials, pool);
      console.log('🔐 Login result:', { success: result.success, email: credentials.email });
      return result;
      
    } catch (error) {
      console.error('Error en login:', error);
      return {
        success: false,
        message: 'Error interno del servidor'
      };
    }
  }

  private static async loginWithDatabase(credentials: LoginRequest, pool: any): Promise<LoginResponse> {
    // Buscar usuario por email (sin filtrar por Status)
    const userResult = await pool.request()
      .input('email', sql.VarChar, credentials.email)
      .query(`
        SELECT Id, Name, Email, PasswordHash, Status 
        FROM USERS 
        WHERE Email = @email
      `);

    if (userResult.recordset.length === 0) {
      return {
        success: false,
        message: 'Credenciales inválidas'
      };
    }

    const user = userResult.recordset[0] as User;

    // Si el usuario está deshabilitado
    if (user.Status === 0) {
      return {
        success: false,
        message: 'Usuario deshabilitado'
      };
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(credentials.password, user.PasswordHash);
    if (!isValidPassword) {
      return {
        success: false,
        message: 'Credenciales inválidas'
      };
    }

    // Obtener permisos del usuario
    const permissionsResult = await pool.request()
      .input('userId', sql.Int, user.Id)
      .query(`
        SELECT p.Name 
        FROM PERMISSIONS p
        INNER JOIN PERMISSIONS_BY_USER pbu ON p.Id = pbu.PermissionId
        WHERE pbu.UserId = @userId
      `);

    const permissions = permissionsResult.recordset.map((p: any) => p.Name);

    // Actualizar último acceso
    await pool.request()
      .input('userId', sql.Int, user.Id)
      .input('lastAccess', sql.DateTime, new Date())
      .query('UPDATE USERS SET LastAccess = @lastAccess WHERE Id = @userId');

    // Generar token JWT
    const token = this.generateToken({
      userId: user.Id,
      email: user.Email
    });

    return {
      success: true,
      user: {
        id: user.Id,
        name: user.Name,
        email: user.Email,
        permissions
      },
      token
    };
  }



  static async getUserById(userId: number): Promise<User | null> {
    try {
      const pool = getPool();
      
      if (!pool) {
        console.error('Pool de conexión no disponible');
        return null;
      }
      
      const result = await pool.request()
        .input('userId', sql.Int, userId)
        .query(`
          SELECT Id, Name, Email, LastAccess, Status
          FROM USERS 
          WHERE Id = @userId AND Status = 1
        `);

      return result.recordset.length > 0 ? result.recordset[0] as User : null;
    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      return null;
    }
  }

  static async getUserPermissions(userId: number): Promise<string[]> {
    try {
      const pool = getPool();
      
      if (!pool) {
        console.error('Pool de conexión no disponible para obtener permisos');
        return [];
      }
      
      const permissionsResult = await pool.request()
        .input('userId', sql.Int, userId)
        .query(`
          SELECT p.Name 
          FROM PERMISSIONS p
          INNER JOIN PERMISSIONS_BY_USER pbu ON p.Id = pbu.PermissionId
          WHERE pbu.UserId = @userId
        `);

      return permissionsResult.recordset.map((p: any) => p.Name);
    } catch (error) {
      console.error('Error obteniendo permisos:', error);
      return [];
    }
  }

  static async updateUserLastLogin(userId: number): Promise<void> {
    try {
      const pool = getPool();
      
      if (!pool) {
        console.error('Pool de conexión no disponible para actualizar último login');
        return;
      }
      
      await pool.request()
        .input('userId', sql.Int, userId)
        .input('lastAccess', sql.DateTime, new Date())
        .query('UPDATE USERS SET LastAccess = @lastAccess WHERE Id = @userId');
    } catch (error) {
      console.error('Error actualizando último acceso:', error);
    }
  }

  static generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN
    } as jwt.SignOptions);
  }

  static verifyToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, this.JWT_SECRET) as JWTPayload;
    } catch (error) {
      return null;
    }
  }

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }
}
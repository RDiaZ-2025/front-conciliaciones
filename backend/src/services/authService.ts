import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Permission, PermissionByUser } from '../models';
import { AppDataSource } from '../config/typeorm.config';
import { LoginRequest, LoginResponse, JWTPayload } from '../types';

// Servicio de autenticación usando base de datos

export class AuthService {
  private static readonly SALT_ROUNDS = 12;
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-for-development';
  private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

  static {
    // Debug: verificar que JWT_SECRET esté cargado
    if (!process.env.JWT_SECRET) {
      console.warn('⚠️ JWT_SECRET no encontrado en variables de entorno, usando fallback');
    }
  }

  static async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {

      if (!AppDataSource.isInitialized) {
        console.error('❌ Base de datos no disponible');
        return {
          success: false,
          message: 'Servicio de autenticación no disponible'
        };
      }

      const result = await this.loginWithTypeORM(credentials);
      return result;

    } catch (error) {
      console.error('Error en login:', error);
      return {
        success: false,
        message: 'Error interno del servidor'
      };
    }
  }

  private static async loginWithTypeORM(credentials: LoginRequest): Promise<LoginResponse> {
    const userRepository = AppDataSource.getRepository(User);
    const permissionByUserRepository = AppDataSource.getRepository(PermissionByUser);

    // Buscar usuario por email
    const user = await userRepository.findOne({
      where: { email: credentials.email },
      relations: ['role', 'role.permissions']
    });

    if (!user) {
      return {
        success: false,
        message: 'Credenciales inválidas'
      };
    }

    // Si el usuario está deshabilitado
    if (user.status === 0) {
      return {
        success: false,
        message: 'Usuario deshabilitado'
      };
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(credentials.password, user.passwordHash);
    if (!isValidPassword) {
      return {
        success: false,
        message: 'Credenciales inválidas'
      };
    }

    // Obtener permisos del usuario
    const userPermissions = await permissionByUserRepository.find({
      where: { userId: user.id },
      relations: ['permission']
    });

    // Combinar permisos del rol y permisos directos
    const directPermissions = userPermissions.map(up => up.permission.name);
    const rolePermissions = user.role?.permissions?.map(p => p.name) || [];

    const permissions = [...new Set([...directPermissions, ...rolePermissions])];

    // Actualizar último acceso
    await userRepository.update(user.id, { lastAccess: new Date() });

    // Generar token JWT
    const token = this.generateToken({
      userId: user.id,
      email: user.email
    });

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        permissions,
        role: user.role?.name || null
      },
      token
    };
  }



  static async getUserById(userId: number): Promise<User | null> {
    try {
      if (!AppDataSource.isInitialized) {
        console.error('Base de datos no disponible');
        return null;
      }

      const userRepository = AppDataSource.getRepository(User);

      const user = await userRepository.findOne({
        where: { id: userId, status: 1 }
      });

      return user;
    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      return null;
    }
  }

  static async getUserPermissions(userId: number): Promise<string[]> {
    try {
      if (!AppDataSource.isInitialized) {
        console.error('Base de datos no disponible para obtener permisos');
        return [];
      }

      const permissionByUserRepository = AppDataSource.getRepository(PermissionByUser);

      const userPermissions = await permissionByUserRepository.find({
        where: { userId: userId },
        relations: ['permission']
      });

      return userPermissions.map(up => up.permission.name);
    } catch (error) {
      console.error('Error obteniendo permisos:', error);
      return [];
    }
  }

  static async updateUserLastLogin(userId: number): Promise<void> {
    try {
      if (!AppDataSource.isInitialized) {
        console.error('Base de datos no disponible para actualizar último login');
        return;
      }

      const userRepository = AppDataSource.getRepository(User);

      await userRepository.update(userId, { lastAccess: new Date() });
    } catch (error) {
      console.error('Error actualizando último acceso:', error);
    }
  }

  static generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN
    } as jwt.SignOptions);
  }

  static async verifyToken(token: string): Promise<JWTPayload | null> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as JWTPayload;

      const userRepository = AppDataSource.getRepository(User);
      const permissionByUserRepository = AppDataSource.getRepository(PermissionByUser);

      const user = await userRepository.findOne({
        where: { id: decoded.userId },
        relations: ['role', 'role.permissions']
      });

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      const userPermissions = await permissionByUserRepository.find({
        where: { userId: user.id },
        relations: ['permission']
      });

      const directPermissions = userPermissions.map(up => up.permission.name);
      const rolePermissions = user.role?.permissions?.map(p => p.name) || [];

      const permissions = [...new Set([...directPermissions, ...rolePermissions])];

      return {
        userId: user.id,
        email: user.email,
        permissions,
        role: user.role?.name || null,
        exp: decoded.exp
      };
    } catch (error) {
      throw new Error('Token inválido');
    }
  }

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }
}
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Permission, PermissionByUser } from '../models';
import { AppDataSource } from '../config/typeorm.config';
import { LoginRequest, LoginResponse, JWTPayload } from '../types';

// Servicio de autenticación usando base de datos

export class AuthService {
  private readonly SALT_ROUNDS = 12;
  private readonly JWT_SECRET: string;
  private readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    if (!AppDataSource.isInitialized) {
      console.error('❌ Base de datos no disponible');
      return {
        success: false,
        message: 'Servicio de autenticación no disponible'
      };
    }

    const result = await this.loginWithTypeORM(credentials);
    return result;
  }

  private async loginWithTypeORM(credentials: LoginRequest): Promise<LoginResponse> {
    const userRepository = AppDataSource.getRepository(User);

    // Buscar usuario por email
    const user = await userRepository.findOne({
      where: { email: credentials.email },
      relations: ['team', 'permissions', 'permissions.permission']
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

    // Combinar permisos del rol, permisos directos y la columna de permisos (para compatibilidad con NOC)
    const dbPermissions = user.permissions?.map(up => up.permission?.name).filter(Boolean) || [];
    const colPermissions = user.permissionsStr
      ? user.permissionsStr.split(',').map(p => p.trim()).filter(Boolean)
      : [];
    const permissions = Array.from(new Set([...dbPermissions, ...colPermissions]));

    // Obtener el rol del usuario desde la base de datos
    const role = user.role || 'user';

    // Obtener equipos del usuario
    const teams = user.team ? [user.team.name] : [];

    // Actualizar último acceso
    await userRepository.update(user.id, { lastAccess: new Date() });

    // Generar token JWT con rol y permisos
    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role,
      permissions
    });

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        permissions,
        role,
        teams,
        teamId: user.team?.id
      },
      token
    };
  }



  async getUserById(userId: number): Promise<User | null> {
    if (!AppDataSource.isInitialized) {
      console.error('Base de datos no disponible');
      return null;
    }

    const userRepository = AppDataSource.getRepository(User);

    const user = await userRepository.findOne({
      where: { id: userId, status: 1 }
    });

    return user;
  }

  async getUserPermissions(userId: number): Promise<string[]> {
    if (!AppDataSource.isInitialized) {
      console.error('Base de datos no disponible para obtener permisos');
      return [];
    }

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: userId }
    });

    const permissionByUserRepository = AppDataSource.getRepository(PermissionByUser);

    const userPermissions = await permissionByUserRepository.find({
      where: { userId: userId },
      relations: ['permission']
    });

    const dbPermissions = userPermissions.map(up => up.permission?.name).filter(Boolean);
    const colPermissions = user?.permissionsStr
      ? user.permissionsStr.split(',').map(p => p.trim()).filter(Boolean)
      : [];

    return Array.from(new Set([...dbPermissions, ...colPermissions]));
  }

  async getUserTeams(userId: number): Promise<string[]> {
    if (!AppDataSource.isInitialized) {
      console.error('Database not available to get teams');
      return [];
    }

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: userId },
      relations: ['team']
    });

    return user?.team ? [user.team.name] : [];
  }

  async updateUserLastLogin(userId: number): Promise<void> {
    if (!AppDataSource.isInitialized) {
      console.error('Base de datos no disponible para actualizar último login');
      return;
    }

    const userRepository = AppDataSource.getRepository(User);

    await userRepository.update(userId, { lastAccess: new Date() });
  }

  generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN
    } as jwt.SignOptions);
  }

  async verifyToken(token: string): Promise<JWTPayload | null> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as JWTPayload;

      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: decoded.userId }
      });

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      const permissions = await this.getUserPermissions(user.id);
      const role = user.role || 'user';

      return {
        userId: user.id,
        email: user.email,
        role,
        permissions,
        exp: decoded.exp
      };
    } catch (error) {
      throw new Error('Token inválido');
    }
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  constructor() {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret === 'fallback-secret-key-for-development') {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('FATAL SECURITY ERROR: JWT_SECRET must be securely set in environment variables in production.');
      }
      console.warn('⚠️ ADVERTENCIA DE SEGURIDAD: JWT_SECRET no configurado, utilizando clave de desarrollo.');
      this.JWT_SECRET = 'fallback-secret-key-for-development';
    } else {
      this.JWT_SECRET = secret;
    }
  }
}
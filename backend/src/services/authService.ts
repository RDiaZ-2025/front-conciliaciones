import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Permission, PermissionByUser } from '../models';
import { AppDataSource } from '../config/typeorm.config';
import { LoginRequest, LoginResponse, JWTPayload } from '../types';

// Servicio de autenticación usando base de datos

export class AuthService {
  private readonly SALT_ROUNDS = 12;
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-for-development';
  private readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

  async login(credentials: LoginRequest): Promise<LoginResponse> {
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

  private async loginWithTypeORM(credentials: LoginRequest): Promise<LoginResponse> {
    const userRepository = AppDataSource.getRepository(User);
    const permissionByUserRepository = AppDataSource.getRepository(PermissionByUser);

    // Buscar usuario por email
    const user = await userRepository.findOne({
      where: { email: credentials.email },
      relations: ['team']
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
    const permissions = userPermissions.map(up => up.permission.name);

    // Obtener equipos del usuario
    const teams = user.team ? [user.team.name] : [];

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
        teams,
        teamId: user.team?.id
      },
      token
    };
  }



  async getUserById(userId: number): Promise<User | null> {
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

  async getUserPermissions(userId: number): Promise<string[]> {
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

  async getUserTeams(userId: number): Promise<string[]> {
    try {
      if (!AppDataSource.isInitialized) {
        return [];
      }
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: userId },
        relations: ['team']
      });
      return user?.team ? [user.team.name] : [];
    } catch (error) {
      console.error('Error getting user teams:', error);
      return [];
    }
  }

  async updateUserLastLogin(userId: number): Promise<void> {
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

  generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN
    } as jwt.SignOptions);
  }

  async verifyToken(token: string): Promise<JWTPayload | null> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as JWTPayload;

      const userRepository = AppDataSource.getRepository(User);
      const permissionByUserRepository = AppDataSource.getRepository(PermissionByUser);

      const user = await userRepository.findOne({
        where: { id: decoded.userId }
      });

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      const userPermissions = await permissionByUserRepository.find({
        where: { userId: user.id },
        relations: ['permission']
      });

      const permissions = userPermissions.map(up => up.permission.name);

      return {
        userId: user.id,
        email: user.email,
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

  async initializeUsers(): Promise<string[]> {
    if (!AppDataSource.isInitialized) {
      throw new Error('Base de datos no disponible');
    }

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

      const users = [
        { name: 'Administrador Test', email: 'admin@test.com', hash: passwordHash, permissions: ['document_upload', 'management_dashboard', 'admin_panel'] },
        { name: 'Manager Test', email: 'manager@test.com', hash: managerHash, permissions: ['document_upload', 'management_dashboard'] },
        { name: 'Usuario Test', email: 'user@test.com', hash: userHash, permissions: ['management_dashboard'] },
        { name: 'Administrador Sistema Legacy', email: 'admin@claromedia.com', hash: passwordHash, permissions: ['document_upload', 'management_dashboard', 'admin_panel'] },
        { name: 'Usuario Carga Legacy', email: 'upload@claromedia.com', hash: uploadHash, permissions: ['document_upload'] },
        { name: 'Usuario Dashboard Legacy', email: 'dashboard@claromedia.com', hash: dashboardHash, permissions: ['management_dashboard'] }
      ];

      for (const userData of users) {
        const existingUser = await userRepository.findOne({
          where: { email: userData.email }
        });

        if (!existingUser) {
          const newUser = userRepository.create({
            name: userData.name,
            email: userData.email,
            passwordHash: userData.hash,
            status: 1
          });

          const savedUser = await userRepository.save(newUser);

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
        }
      }

      await queryRunner.commitTransaction();

      return [
        'admin@claromedia.com / admin123 (Administrador completo)',
        'admin@test.com / admin123 (Administrador test)',
        'manager@test.com / manager123 (Manager)',
        'user@test.com / user123 (Usuario básico)',
        'upload@claromedia.com / upload123 (Solo carga)',
        'dashboard@claromedia.com / dashboard123 (Solo dashboard)'
      ];
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

    constructor() {

            // Debug: verificar que JWT_SECRET esté cargado
            if (!process.env.JWT_SECRET) {
              console.warn('⚠️ JWT_SECRET no encontrado en variables de entorno, usando fallback');
            }
          
    }
}
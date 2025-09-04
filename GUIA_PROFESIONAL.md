# Guía Profesional: Implementación Completa Frontend-Backend-Database

## 🎯 Objetivo
Implementar una conexión robusta y profesional entre tu aplicación React y la base de datos SQL Server, siguiendo las mejores prácticas de la industria.

---

## 📊 Análisis de tu Base de Datos Actual

Basado en tu estructura SQL Server:
- **USERS**: Gestión de usuarios con autenticación
- **PERMISSIONS**: Catálogo de permisos del sistema
- **PERMISSIONS_BY_USER**: Relación muchos-a-muchos usuario-permisos

---

## 🗺️ Roadmap de Implementación (4 Semanas)

### **SEMANA 1: Fundación Backend**
- Configuración del proyecto Node.js + TypeScript
- Conexión segura a SQL Server
- Implementación de autenticación JWT
- Middleware de seguridad

### **SEMANA 2: API y Lógica de Negocio**
- Controladores y servicios
- Validación de datos
- Manejo de errores
- Testing básico

### **SEMANA 3: Integración Frontend**
- Adaptación del AuthContext
- Sistema de permisos
- Manejo de estados
- UI/UX optimizado

### **SEMANA 4: Producción y Optimización**
- Despliegue en Azure
- Monitoreo y logging
- Optimización de performance
- Documentación

---

## 🚀 FASE 1: CONFIGURACIÓN INICIAL

### 1.1 Crear Proyecto Backend
```bash
# Crear directorio del backend
mkdir backend-conciliaciones
cd backend-conciliaciones

# Inicializar proyecto
npm init -y

# Instalar dependencias principales
npm install express cors helmet morgan dotenv
npm install mssql bcryptjs jsonwebtoken
npm install express-rate-limit express-validator
npm install compression cookie-parser

# Dependencias de desarrollo
npm install -D nodemon typescript @types/node
npm install -D @types/express @types/bcryptjs @types/jsonwebtoken
npm install -D @types/cors @types/compression @types/cookie-parser
npm install -D ts-node jest @types/jest supertest @types/supertest
```

### 1.2 Configuración TypeScript
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "removeComments": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### 1.3 Estructura del Proyecto
```
backend-conciliaciones/
├── src/
│   ├── config/
│   │   ├── database.ts
│   │   ├── auth.ts
│   │   └── constants.ts
│   ├── controllers/
│   │   ├── authController.ts
│   │   ├── userController.ts
│   │   └── permissionController.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── validation.ts
│   │   ├── errorHandler.ts
│   │   └── security.ts
│   ├── models/
│   │   ├── User.ts
│   │   ├── Permission.ts
│   │   └── index.ts
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   └── permissions.ts
│   ├── services/
│   │   ├── authService.ts
│   │   ├── userService.ts
│   │   └── permissionService.ts
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── validators.ts
│   │   └── helpers.ts
│   ├── types/
│   │   └── index.ts
│   ├── app.ts
│   └── server.ts
├── tests/
├── .env
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔧 FASE 2: CONFIGURACIÓN DE BASE DE DATOS

### 2.1 Variables de Entorno
```env
# .env
# Servidor
PORT=3001
NODE_ENV=development

# Base de Datos SQL Server
DB_SERVER=voc-observer-database-windows-net-voc-db.database.windows.net
DB_DATABASE=voc_db
DB_USER=tu-usuario
DB_PASSWORD=tu-contraseña
DB_PORT=1433
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=false

# JWT
JWT_SECRET=tu-clave-jwt-super-segura-aqui-min-32-caracteres
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# CORS
FRONTEND_URL=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

### 2.2 Configuración de Conexión
```typescript
// src/config/database.ts
import sql from 'mssql';
import { logger } from '../utils/logger';

interface DatabaseConfig {
  server: string;
  database: string;
  user: string;
  password: string;
  port: number;
  options: {
    encrypt: boolean;
    trustServerCertificate: boolean;
    enableArithAbort: boolean;
    requestTimeout: number;
    connectionTimeout: number;
  };
  pool: {
    max: number;
    min: number;
    idleTimeoutMillis: number;
    acquireTimeoutMillis: number;
  };
}

const config: DatabaseConfig = {
  server: process.env.DB_SERVER!,
  database: process.env.DB_DATABASE!,
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
    requestTimeout: 30000,
    connectionTimeout: 15000,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 60000,
  },
};

let pool: sql.ConnectionPool | null = null;

export const connectDB = async (): Promise<sql.ConnectionPool> => {
  try {
    if (pool && pool.connected) {
      return pool;
    }

    pool = new sql.ConnectionPool(config);
    await pool.connect();
    
    logger.info('✅ Conectado exitosamente a SQL Server');
    logger.info(`📊 Base de datos: ${config.database}`);
    
    // Configurar eventos de la conexión
    pool.on('error', (err) => {
      logger.error('❌ Error en la conexión de base de datos:', err);
    });

    return pool;
  } catch (error) {
    logger.error('❌ Error conectando a la base de datos:', error);
    throw new Error('No se pudo conectar a la base de datos');
  }
};

export const getPool = (): sql.ConnectionPool => {
  if (!pool || !pool.connected) {
    throw new Error('Base de datos no inicializada. Llama a connectDB() primero.');
  }
  return pool;
};

export const closeDB = async (): Promise<void> => {
  if (pool) {
    await pool.close();
    pool = null;
    logger.info('🔌 Conexión a base de datos cerrada');
  }
};

export { sql };
```

---

## 🏗️ FASE 3: MODELOS Y TIPOS

### 3.1 Definición de Tipos
```typescript
// src/types/index.ts
export interface User {
  Id: number;
  Name: string;
  Email: string;
  PasswordHash: string;
  LastAccess?: Date;
  Status: number;
  CreatedAt?: Date;
  UpdatedAt?: Date;
}

export interface Permission {
  Id: number;
  Name: string;
  Description?: string;
  CreatedAt?: Date;
}

export interface UserPermission {
  Id: number;
  UserId: number;
  PermissionId: number;
  CreatedAt?: Date;
}

export interface UserWithPermissions extends Omit<User, 'PasswordHash'> {
  Permissions: Permission[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: UserWithPermissions;
  token: string;
  refreshToken?: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  permissionIds?: number[];
}

export interface UpdateUserRequest {
  name?: string;
  password?: string;
  permissionIds?: number[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### 3.2 Modelo de Usuario
```typescript
// src/models/User.ts
import { getPool, sql } from '../config/database';
import bcrypt from 'bcryptjs';
import { User, UserWithPermissions, CreateUserRequest, UpdateUserRequest } from '../types';
import { logger } from '../utils/logger';

export class UserModel {
  static async findByEmail(email: string): Promise<UserWithPermissions | null> {
    try {
      const pool = getPool();
      const result = await pool.request()
        .input('email', sql.VarChar, email)
        .query(`
          SELECT 
            u.Id, u.Name, u.Email, u.PasswordHash, u.LastAccess, u.Status,
            p.Id as PermissionId, p.Name as PermissionName, p.Description as PermissionDescription
          FROM USERS u
          LEFT JOIN PERMISSIONS_BY_USER pbu ON u.Id = pbu.UserId
          LEFT JOIN PERMISSIONS p ON pbu.PermissionId = p.Id
          WHERE u.Email = @email AND u.Status = 1
        `);

      if (result.recordset.length === 0) {
        return null;
      }

      return this.mapUserWithPermissions(result.recordset);
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw error;
    }
  }

  static async findById(id: number): Promise<UserWithPermissions | null> {
    try {
      const pool = getPool();
      const result = await pool.request()
        .input('id', sql.Int, id)
        .query(`
          SELECT 
            u.Id, u.Name, u.Email, u.LastAccess, u.Status,
            p.Id as PermissionId, p.Name as PermissionName, p.Description as PermissionDescription
          FROM USERS u
          LEFT JOIN PERMISSIONS_BY_USER pbu ON u.Id = pbu.UserId
          LEFT JOIN PERMISSIONS p ON pbu.PermissionId = p.Id
          WHERE u.Id = @id AND u.Status = 1
        `);

      if (result.recordset.length === 0) {
        return null;
      }

      return this.mapUserWithPermissions(result.recordset);
    } catch (error) {
      logger.error('Error finding user by ID:', error);
      throw error;
    }
  }

  static async create(userData: CreateUserRequest): Promise<UserWithPermissions> {
    const pool = getPool();
    const transaction = new sql.Transaction(pool);
    
    try {
      await transaction.begin();
      
      // Hash password
      const passwordHash = await bcrypt.hash(userData.password, 12);
      
      // Create user
      const userResult = await transaction.request()
        .input('name', sql.VarChar, userData.name)
        .input('email', sql.VarChar, userData.email)
        .input('passwordHash', sql.VarChar, passwordHash)
        .query(`
          INSERT INTO USERS (Name, Email, PasswordHash, Status)
          OUTPUT INSERTED.Id, INSERTED.Name, INSERTED.Email, INSERTED.Status
          VALUES (@name, @email, @passwordHash, 1)
        `);

      const newUser = userResult.recordset[0];
      
      // Assign permissions if provided
      if (userData.permissionIds && userData.permissionIds.length > 0) {
        for (const permissionId of userData.permissionIds) {
          await transaction.request()
            .input('userId', sql.Int, newUser.Id)
            .input('permissionId', sql.Int, permissionId)
            .query(`
              INSERT INTO PERMISSIONS_BY_USER (UserId, PermissionId)
              VALUES (@userId, @permissionId)
            `);
        }
      }
      
      await transaction.commit();
      
      // Return user with permissions
      const userWithPermissions = await this.findById(newUser.Id);
      if (!userWithPermissions) {
        throw new Error('Error retrieving created user');
      }
      
      return userWithPermissions;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  static async update(id: number, updates: UpdateUserRequest): Promise<UserWithPermissions> {
    const pool = getPool();
    const transaction = new sql.Transaction(pool);
    
    try {
      await transaction.begin();
      
      // Update user basic info
      const request = transaction.request().input('id', sql.Int, id);
      const setClauses: string[] = [];
      
      if (updates.name) {
        request.input('name', sql.VarChar, updates.name);
        setClauses.push('Name = @name');
      }
      
      if (updates.password) {
        const passwordHash = await bcrypt.hash(updates.password, 12);
        request.input('passwordHash', sql.VarChar, passwordHash);
        setClauses.push('PasswordHash = @passwordHash');
      }
      
      if (setClauses.length > 0) {
        await request.query(`
          UPDATE USERS 
          SET ${setClauses.join(', ')}
          WHERE Id = @id
        `);
      }
      
      // Update permissions if provided
      if (updates.permissionIds !== undefined) {
        // Remove existing permissions
        await transaction.request()
          .input('userId', sql.Int, id)
          .query('DELETE FROM PERMISSIONS_BY_USER WHERE UserId = @userId');
        
        // Add new permissions
        for (const permissionId of updates.permissionIds) {
          await transaction.request()
            .input('userId', sql.Int, id)
            .input('permissionId', sql.Int, permissionId)
            .query(`
              INSERT INTO PERMISSIONS_BY_USER (UserId, PermissionId)
              VALUES (@userId, @permissionId)
            `);
        }
      }
      
      await transaction.commit();
      
      const updatedUser = await this.findById(id);
      if (!updatedUser) {
        throw new Error('User not found after update');
      }
      
      return updatedUser;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  static async delete(id: number): Promise<void> {
    try {
      const pool = getPool();
      const result = await pool.request()
        .input('id', sql.Int, id)
        .query('UPDATE USERS SET Status = 0 WHERE Id = @id');
      
      if (result.rowsAffected[0] === 0) {
        throw new Error('User not found');
      }
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }

  static async getAll(): Promise<UserWithPermissions[]> {
    try {
      const pool = getPool();
      const result = await pool.request()
        .query(`
          SELECT 
            u.Id, u.Name, u.Email, u.LastAccess, u.Status,
            p.Id as PermissionId, p.Name as PermissionName, p.Description as PermissionDescription
          FROM USERS u
          LEFT JOIN PERMISSIONS_BY_USER pbu ON u.Id = pbu.UserId
          LEFT JOIN PERMISSIONS p ON pbu.PermissionId = p.Id
          WHERE u.Status = 1
          ORDER BY u.Name
        `);

      return this.mapUsersWithPermissions(result.recordset);
    } catch (error) {
      logger.error('Error getting all users:', error);
      throw error;
    }
  }

  static async updateLastAccess(id: number): Promise<void> {
    try {
      const pool = getPool();
      await pool.request()
        .input('id', sql.Int, id)
        .input('lastAccess', sql.DateTime, new Date())
        .query('UPDATE USERS SET LastAccess = @lastAccess WHERE Id = @id');
    } catch (error) {
      logger.error('Error updating last access:', error);
      throw error;
    }
  }

  private static mapUserWithPermissions(records: any[]): UserWithPermissions {
    if (records.length === 0) {
      throw new Error('No records to map');
    }

    const user = records[0];
    const permissions = records
      .filter(record => record.PermissionId)
      .map(record => ({
        Id: record.PermissionId,
        Name: record.PermissionName,
        Description: record.PermissionDescription
      }));

    return {
      Id: user.Id,
      Name: user.Name,
      Email: user.Email,
      LastAccess: user.LastAccess,
      Status: user.Status,
      Permissions: permissions
    };
  }

  private static mapUsersWithPermissions(records: any[]): UserWithPermissions[] {
    const usersMap = new Map<number, UserWithPermissions>();

    records.forEach(record => {
      if (!usersMap.has(record.Id)) {
        usersMap.set(record.Id, {
          Id: record.Id,
          Name: record.Name,
          Email: record.Email,
          LastAccess: record.LastAccess,
          Status: record.Status,
          Permissions: []
        });
      }

      if (record.PermissionId) {
        const user = usersMap.get(record.Id)!;
        user.Permissions.push({
          Id: record.PermissionId,
          Name: record.PermissionName,
          Description: record.PermissionDescription
        });
      }
    });

    return Array.from(usersMap.values());
  }
}
```

---

## 🔐 FASE 4: AUTENTICACIÓN Y SEGURIDAD

### 4.1 Servicio de Autenticación
```typescript
// src/services/authService.ts
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { UserModel } from '../models/User';
import { LoginRequest, LoginResponse, UserWithPermissions } from '../types';
import { logger } from '../utils/logger';

export class AuthService {
  static async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const { email, password } = credentials;
      
      // Find user
      const user = await UserModel.findByEmail(email);
      if (!user) {
        throw new Error('Credenciales inválidas');
      }
      
      // Verify password
      const isValidPassword = await bcrypt.compare(password, (user as any).PasswordHash);
      if (!isValidPassword) {
        throw new Error('Credenciales inválidas');
      }
      
      // Update last access
      await UserModel.updateLastAccess(user.Id);
      
      // Generate tokens
      const token = this.generateAccessToken(user);
      
      // Remove sensitive data
      const userResponse: UserWithPermissions = {
        Id: user.Id,
        Name: user.Name,
        Email: user.Email,
        LastAccess: new Date(),
        Status: user.Status,
        Permissions: user.Permissions
      };
      
      logger.info(`User logged in: ${user.Email}`);
      
      return {
        user: userResponse,
        token
      };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }
  
  static async verifyToken(token: string): Promise<UserWithPermissions> {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      const user = await UserModel.findById(decoded.userId);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }
      
      return user;
    } catch (error) {
      logger.error('Token verification error:', error);
      throw new Error('Token inválido');
    }
  }
  
  private static generateAccessToken(user: UserWithPermissions): string {
    const payload = {
      userId: user.Id,
      email: user.Email,
      permissions: user.Permissions.map(p => p.Name)
    };
    
    return jwt.sign(
      payload,
      process.env.JWT_SECRET!,
      { 
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        issuer: 'conciliaciones-app',
        audience: 'conciliaciones-users'
      }
    );
  }
}
```

### 4.2 Middleware de Autenticación
```typescript
// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { UserWithPermissions } from '../types';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  user?: UserWithPermissions;
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Token de acceso requerido'
      });
      return;
    }
    
    const user = await AuthService.verifyToken(token);
    req.user = user;
    
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(403).json({
      success: false,
      message: 'Token inválido o expirado'
    });
  }
};

export const requirePermission = (permissionName: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
      return;
    }
    
    const hasPermission = req.user.Permissions.some(
      permission => permission.Name === permissionName
    );
    
    if (!hasPermission) {
      res.status(403).json({
        success: false,
        message: `Permiso requerido: ${permissionName}`
      });
      return;
    }
    
    next();
  };
};

export const requireAnyPermission = (permissionNames: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
      return;
    }
    
    const hasAnyPermission = req.user.Permissions.some(
      permission => permissionNames.includes(permission.Name)
    );
    
    if (!hasAnyPermission) {
      res.status(403).json({
        success: false,
        message: `Se requiere uno de los siguientes permisos: ${permissionNames.join(', ')}`
      });
      return;
    }
    
    next();
  };
};
```

---

## 🎮 FASE 5: CONTROLADORES

### 5.1 Controlador de Autenticación
```typescript
// src/controllers/authController.ts
import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { AuthRequest } from '../middleware/auth';
import { LoginRequest, ApiResponse } from '../types';
import { validationResult } from 'express-validator';
import { logger } from '../utils/logger';

export class AuthController {
  static async login(req: Request, res: Response): Promise<void> {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array().map(err => err.msg)
        });
        return;
      }
      
      const credentials: LoginRequest = req.body;
      const result = await AuthService.login(credentials);
      
      res.json({
        success: true,
        data: result,
        message: 'Login exitoso'
      });
    } catch (error: any) {
      logger.error('Login controller error:', error);
      res.status(401).json({
        success: false,
        message: error.message || 'Error en el login'
      });
    }
  }
  
  static async verify(req: AuthRequest, res: Response): Promise<void> {
    try {
      res.json({
        success: true,
        data: { user: req.user },
        message: 'Token válido'
      });
    } catch (error: any) {
      logger.error('Verify controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Error verificando token'
      });
    }
  }
  
  static async logout(req: AuthRequest, res: Response): Promise<void> {
    try {
      // En un sistema más avanzado, aquí invalidarías el token en una blacklist
      logger.info(`User logged out: ${req.user?.Email}`);
      
      res.json({
        success: true,
        message: 'Logout exitoso'
      });
    } catch (error: any) {
      logger.error('Logout controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Error en logout'
      });
    }
  }
}
```

### 5.2 Controlador de Usuarios
```typescript
// src/controllers/userController.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { UserModel } from '../models/User';
import { CreateUserRequest, UpdateUserRequest } from '../types';
import { validationResult } from 'express-validator';
import { logger } from '../utils/logger';

export class UserController {
  static async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const users = await UserModel.getAll();
      
      res.json({
        success: true,
        data: users,
        message: 'Usuarios obtenidos exitosamente'
      });
    } catch (error: any) {
      logger.error('Get all users error:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo usuarios'
      });
    }
  }
  
  static async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = parseInt(id);
      
      if (isNaN(userId)) {
        res.status(400).json({
          success: false,
          message: 'ID de usuario inválido'
        });
        return;
      }
      
      const user = await UserModel.findById(userId);
      
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
        return;
      }
      
      res.json({
        success: true,
        data: user,
        message: 'Usuario obtenido exitosamente'
      });
    } catch (error: any) {
      logger.error('Get user by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo usuario'
      });
    }
  }
  
  static async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array().map(err => err.msg)
        });
        return;
      }
      
      const userData: CreateUserRequest = req.body;
      
      // Check if email already exists
      const existingUser = await UserModel.findByEmail(userData.email);
      if (existingUser) {
        res.status(409).json({
          success: false,
          message: 'El email ya está registrado'
        });
        return;
      }
      
      const newUser = await UserModel.create(userData);
      
      res.status(201).json({
        success: true,
        data: newUser,
        message: 'Usuario creado exitosamente'
      });
    } catch (error: any) {
      logger.error('Create user error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creando usuario'
      });
    }
  }
  
  static async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array().map(err => err.msg)
        });
        return;
      }
      
      const { id } = req.params;
      const userId = parseInt(id);
      const updates: UpdateUserRequest = req.body;
      
      if (isNaN(userId)) {
        res.status(400).json({
          success: false,
          message: 'ID de usuario inválido'
        });
        return;
      }
      
      const updatedUser = await UserModel.update(userId, updates);
      
      res.json({
        success: true,
        data: updatedUser,
        message: 'Usuario actualizado exitosamente'
      });
    } catch (error: any) {
      logger.error('Update user error:', error);
      
      if (error.message === 'User not found after update') {
        res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        message: 'Error actualizando usuario'
      });
    }
  }
  
  static async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = parseInt(id);
      
      if (isNaN(userId)) {
        res.status(400).json({
          success: false,
          message: 'ID de usuario inválido'
        });
        return;
      }
      
      // Prevent self-deletion
      if (userId === req.user?.Id) {
        res.status(400).json({
          success: false,
          message: 'No puedes eliminar tu propio usuario'
        });
        return;
      }
      
      await UserModel.delete(userId);
      
      res.json({
        success: true,
        message: 'Usuario eliminado exitosamente'
      });
    } catch (error: any) {
      logger.error('Delete user error:', error);
      
      if (error.message === 'User not found') {
        res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        message: 'Error eliminando usuario'
      });
    }
  }
}
```

---

## 🛣️ FASE 6: RUTAS Y VALIDACIONES

### 6.1 Rutas de Autenticación
```typescript
// src/routes/auth.ts
import { Router } from 'express';
import { body } from 'express-validator';
import { AuthController } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Validation rules
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email válido es requerido'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Contraseña debe tener al menos 6 caracteres')
];

// Routes
router.post('/login', loginValidation, AuthController.login);
router.get('/verify', authenticateToken, AuthController.verify);
router.post('/logout', authenticateToken, AuthController.logout);

export default router;
```

### 6.2 Rutas de Usuarios
```typescript
// src/routes/users.ts
import { Router } from 'express';
import { body, param } from 'express-validator';
import { UserController } from '../controllers/userController';
import { authenticateToken, requirePermission } from '../middleware/auth';

const router = Router();

// Validation rules
const createUserValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nombre debe tener entre 2 y 100 caracteres'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email válido es requerido'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Contraseña debe tener al menos 8 caracteres, incluyendo mayúscula, minúscula, número y símbolo'),
  body('permissionIds')
    .optional()
    .isArray()
    .withMessage('permissionIds debe ser un array')
];

const updateUserValidation = [
  param('id').isInt({ min: 1 }).withMessage('ID debe ser un número entero positivo'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nombre debe tener entre 2 y 100 caracteres'),
  body('password')
    .optional()
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Contraseña debe tener al menos 8 caracteres, incluyendo mayúscula, minúscula, número y símbolo'),
  body('permissionIds')
    .optional()
    .isArray()
    .withMessage('permissionIds debe ser un array')
];

const idValidation = [
  param('id').isInt({ min: 1 }).withMessage('ID debe ser un número entero positivo')
];

// Apply authentication to all routes
router.use(authenticateToken);

// Routes
router.get('/', requirePermission('MANAGE_USERS'), UserController.getAll);
router.get('/:id', idValidation, UserController.getById);
router.post('/', requirePermission('MANAGE_USERS'), createUserValidation, UserController.create);
router.put('/:id', requirePermission('MANAGE_USERS'), updateUserValidation, UserController.update);
router.delete('/:id', requirePermission('MANAGE_USERS'), idValidation, UserController.delete);

export default router;
```

---

## 🚀 FASE 7: SERVIDOR PRINCIPAL

### 7.1 Configuración de la Aplicación
```typescript
// src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/database';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';

// Routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';

const app = express();

// Trust proxy (important for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Compression
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    success: false,
    message: 'Demasiadas solicitudes, intenta de nuevo más tarde'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Logging
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
```

### 7.2 Servidor Principal
```typescript
// src/server.ts
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

import app from './app';
import { connectDB, closeDB } from './config/database';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 3001;

const startServer = async (): Promise<void> => {
  try {
    // Connect to database
    await connectDB();
    
    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Servidor ejecutándose en puerto ${PORT}`);
      logger.info(`🌍 Entorno: ${process.env.NODE_ENV}`);
      logger.info(`📱 Frontend URL: ${process.env.FRONTEND_URL}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
    });
    
    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} recibido. Cerrando servidor...`);
      
      server.close(async () => {
        logger.info('Servidor HTTP cerrado.');
        
        try {
          await closeDB();
          logger.info('Conexión a base de datos cerrada.');
          process.exit(0);
        } catch (error) {
          logger.error('Error cerrando conexión a base de datos:', error);
          process.exit(1);
        }
      });
    };
    
    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    logger.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

startServer();
```

---

## 🔧 FASE 8: UTILIDADES Y MIDDLEWARE

### 8.1 Logger
```typescript
// src/utils/logger.ts
import { createLogger, format, transports } from 'winston';

const { combine, timestamp, errors, json, colorize, simple } = format;

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp(),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: { service: 'conciliaciones-api' },
  transports: [
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' })
  ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: combine(
      colorize(),
      simple()
    )
  }));
}

export { logger };
```

### 8.2 Manejo de Errores
```typescript
// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error('Error handler:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  // Default error
  let status = 500;
  let message = 'Error interno del servidor';
  
  // Handle specific error types
  if (error.name === 'ValidationError') {
    status = 400;
    message = 'Datos de entrada inválidos';
  } else if (error.name === 'UnauthorizedError') {
    status = 401;
    message = 'No autorizado';
  } else if (error.name === 'JsonWebTokenError') {
    status = 401;
    message = 'Token inválido';
  } else if (error.name === 'TokenExpiredError') {
    status = 401;
    message = 'Token expirado';
  } else if (error.code === 'ECONNREFUSED') {
    status = 503;
    message = 'Servicio no disponible';
  }
  
  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};
```

---

## 📦 FASE 9: CONFIGURACIÓN DE SCRIPTS

### 9.1 Package.json
```json
{
  "name": "backend-conciliaciones",
  "version": "1.0.0",
  "description": "Backend API para sistema de conciliaciones",
  "main": "dist/server.js",
  "scripts": {
    "dev": "nodemon",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "clean": "rimraf dist",
    "prebuild": "npm run clean",
    "postbuild": "echo 'Build completed successfully'",
    "db:test": "node -e \"require('./dist/config/database').connectDB().then(() => console.log('✅ Database connection successful')).catch(err => console.error('❌ Database connection failed:', err))\""
  },
  "keywords": ["api", "backend", "conciliaciones", "typescript", "express"],
  "author": "Tu Nombre",
  "license": "MIT"
}
```

### 9.2 Nodemon Configuration
```json
// nodemon.json
{
  "watch": ["src"],
  "ext": "ts,json",
  "ignore": ["src/**/*.test.ts"],
  "exec": "ts-node src/server.ts",
  "env": {
    "NODE_ENV": "development"
  }
}
```

---

## 🔄 FASE 10: ACTUALIZACIÓN DEL FRONTEND

### 10.1 Actualizar apiService.js
```javascript
// src/services/apiService.js
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Auth methods
  async login(email, password) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    
    if (response.success && response.data.token) {
      this.setToken(response.data.token);
    }
    
    return response.data;
  }

  async verifyToken() {
    const response = await this.request('/auth/verify');
    return response.data.user;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
    }
  }

  // User methods
  async getAllUsers() {
    const response = await this.request('/users');
    return response.data;
  }

  async createUser(userData) {
    const response = await this.request('/users', {
      method: 'POST',
      body: userData,
    });
    return response.data;
  }

  async updateUser(id, userData) {
    const response = await this.request(`/users/${id}`, {
      method: 'PUT',
      body: userData,
    });
    return response.data;
  }

  async deleteUser(id) {
    const response = await this.request(`/users/${id}`, {
      method: 'DELETE',
    });
    return response.success;
  }
}

export default new ApiService();
```

### 10.2 Actualizar AuthContext.jsx
```javascript
// Agregar mapeo de permisos a roles
const mapPermissionsToRole = (permissions) => {
  if (!permissions || permissions.length === 0) return null;
  
  const permissionNames = permissions.map(p => p.Name || p.name);
  
  if (permissionNames.includes('MANAGE_USERS')) {
    return ROLES.ADMIN;
  } else if (permissionNames.includes('VIEW_UPLOAD') && permissionNames.includes('VIEW_DASHBOARD')) {
    return ROLES.FULL_ACCESS;
  } else if (permissionNames.includes('VIEW_UPLOAD')) {
    return ROLES.UPLOAD_ONLY;
  } else if (permissionNames.includes('VIEW_DASHBOARD')) {
    return ROLES.DASHBOARD_ONLY;
  }
  
  return null;
};

// Actualizar el login para usar la nueva API
const login = async (email, password) => {
  try {
    setLoading(true);
    setError(null);
    
    const result = await apiService.login(email, password);
    const userRole = mapPermissionsToRole(result.user.Permissions);
    
    const userData = {
      ...result.user,
      role: userRole,
      permissions: result.user.Permissions
    };
    
    setUser(userData);
    setIsAuthenticated(true);
    
    return { success: true, user: userData };
  } catch (error) {
    const errorMessage = error.message || 'Error en el login';
    setError(errorMessage);
    return { success: false, error: errorMessage };
  } finally {
    setLoading(false);
  }
};
```

---

## 🚀 FASE 11: COMANDOS DE EJECUCIÓN

### 11.1 Iniciar el Backend
```bash
# En el directorio backend-conciliaciones
npm run dev
```

### 11.2 Iniciar el Frontend
```bash
# En el directorio del frontend
npm run dev
```

### 11.3 Probar la Conexión
```bash
# Probar health check
curl http://localhost:3001/health

# Probar login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@claromedia.com","password":"tu-contraseña"}'
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Backend
- [ ] Proyecto Node.js + TypeScript configurado
- [ ] Conexión a SQL Server establecida
- [ ] Modelos de datos implementados
- [ ] Autenticación JWT configurada
- [ ] Controladores y rutas creados
- [ ] Middleware de seguridad implementado
- [ ] Validaciones configuradas
- [ ] Manejo de errores implementado
- [ ] Logging configurado

### Frontend
- [ ] Variables de entorno actualizadas
- [ ] ApiService actualizado
- [ ] AuthContext adaptado
- [ ] Sistema de permisos implementado
- [ ] Manejo de errores mejorado

### Base de Datos
- [ ] Usuarios de prueba creados
- [ ] Permisos configurados
- [ ] Relaciones establecidas

### Testing
- [ ] Conexión a BD probada
- [ ] Login funcional
- [ ] CRUD de usuarios operativo
- [ ] Permisos funcionando

---

## 🎯 PRÓXIMOS PASOS

1. **Implementar el backend** siguiendo esta guía
2. **Configurar las variables de entorno**
3. **Crear usuarios de prueba en la BD**
4. **Probar la integración**
5. **Optimizar y desplegar**

¿Te gustaría que implemente alguna parte específica de esta guía?
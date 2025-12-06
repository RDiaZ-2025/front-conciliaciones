export interface User {
  Id: number;
  Name: string;
  Email: string;
  PasswordHash: string;
  LastAccess?: Date;
  Status: number;
}

export interface Permission {
  Id: number;
  Name: string;
  Description?: string;
}

export interface UserPermission {
  Id: number;
  UserId: number;
  PermissionId: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user?: {
    id: number;
    name: string;
    email: string;
    permissions: string[];
    role?: string | null;
  };
  token?: string;
  message?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface JWTPayload {
  userId: number;
  email: string;
  permissions?: string[];
  role?: string | null;
  iat?: number;
  exp?: number;
}

export interface DatabaseConfig {
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
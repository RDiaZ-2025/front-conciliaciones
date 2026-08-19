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
    teams?: string[];
    teamId?: number | null;
  };
  token?: string;
  message?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface UserResponseDTO {
  id: number;
  name: string;
  email: string;
  lastAccess?: Date | null;
  status: number;
  permissions?: string[];
  teamId?: number | null;
  teamName?: string | null;
  bossId?: number | null;
  bossName?: string | null;
  role?: string | null;
  teams?: string[];
}

export interface DashboardStatsResponse {
  total: number;
  active: number;
  completed: number;
  cancelled: number;
  overdue: number;
  atRisk: number;
  inProgress: number;
  pending: number;
  users?: Partial<UserResponseDTO>[];
}

export interface ProductionRequestDTO {
  name?: string;
  department?: string;
  assignedUserId?: number;
  deliveryDate?: string | Date;
  observations?: string;
  status?: string;
  stage?: string;
  customerData?: Record<string, unknown>;
  audienceData?: Record<string, unknown>;
  campaignDetail?: Record<string, unknown> & { budget?: string | number };
  productionInfo?: Record<string, unknown>;
  unitAssigned?: number;
  consecutive?: number;
  [key: string]: unknown;
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
    useUTC?: boolean;
  };
  pool: {
    max: number;
    min: number;
    idleTimeoutMillis: number;
    acquireTimeoutMillis: number;
  };
}
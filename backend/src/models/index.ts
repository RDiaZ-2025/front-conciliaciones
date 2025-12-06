/**
 * Models Index File
 * 
 * This file exports all database models for easy importing throughout the application.
 * Each model represents a table in the database with proper TypeORM annotations,
 * relationships, and business logic methods.
 */

// User Management Models
export * from './User';
export * from './Permission';
export * from './PermissionByUser';

// Document Management Models
export { LoadDocumentsOCbyUser } from './LoadDocumentsOCbyUser';

// Menu System Models
export { MenuItem } from './MenuItem';

// Production Management Models
export { ProductionRequest } from './ProductionRequest';

// Audit and Logging Models
export { UserActionLog } from './UserActionLog';

/**
 * Array of all entity classes for TypeORM configuration
 * Use this array when configuring TypeORM connection
 */
import { User } from './User';
import { Permission } from './Permission';
import { PermissionByUser } from './PermissionByUser';
import { LoadDocumentsOCbyUser } from './LoadDocumentsOCbyUser';
import { MenuItem } from './MenuItem';
import { ProductionRequest } from './ProductionRequest';
import { UserActionLog } from './UserActionLog';

export const entities = [
  User,
  Permission,
  PermissionByUser,
  LoadDocumentsOCbyUser,
  MenuItem,
  ProductionRequest,
  UserActionLog
];

/**
 * Model categories for organized access
 */
export const ModelCategories = {
  /**
   * User and authentication related models
   */
  Auth: {
    User,
    Permission,
    PermissionByUser
  },

  /**
   * Document management models
   */
  Documents: {
    LoadDocumentsOCbyUser
  },

  /**
   * Menu and navigation models
   */
  Menu: {
    MenuItem
  },

  /**
   * Production management models
   */
  Production: {
    ProductionRequest
  },

  /**
   * Audit and logging models
   */
  Audit: {
    UserActionLog
  }
};

/**
 * Type definitions for model relationships
 */
export type UserWithPermissions = User & {
  permissions: (PermissionByUser & { permission: Permission })[];
};

export type MenuItemWithChildren = MenuItem & {
  children: MenuItem[];
};

export type LoadDocumentWithUser = LoadDocumentsOCbyUser & {
  user: User;
};
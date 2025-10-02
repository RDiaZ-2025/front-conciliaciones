/**
 * Models Index File
 * 
 * This file exports all database models for easy importing throughout the application.
 * Each model represents a table in the database with proper TypeORM annotations,
 * relationships, and business logic methods.
 */

// User Management Models
export { User } from './User';
export { Permission } from './Permission';
export { PermissionByUser } from './PermissionByUser';

// Document Management Models
export { LoadDocumentsOCbyUser } from './LoadDocumentsOCbyUser';

// Menu System Models
export { MenuItem } from './MenuItem';

// Production Management Models
export { ProductionRequest } from './ProductionRequest';

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

export const entities = [
  User,
  Permission,
  PermissionByUser,
  LoadDocumentsOCbyUser,
  MenuItem,
  ProductionRequest
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
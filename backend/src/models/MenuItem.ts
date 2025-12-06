import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { Permission } from './Permission';

/**
 * MenuItem entity representing hierarchical menu structure
 * Maps to MenuItems table in the database
 */
@Entity('MenuItems')
@Index('IX_MenuItems_DisplayOrder', ['displayOrder', 'isActive'])
export class MenuItem {
  /**
   * Primary key - Auto-incrementing menu item ID
   */
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  /**
   * Display label for the menu item
   */
  @Column({ name: 'Label', type: 'nvarchar', length: 100, nullable: false })
  label!: string;

  /**
   * Icon class or name for the menu item
   */
  @Column({ name: 'Icon', type: 'nvarchar', length: 50, nullable: true })
  icon!: string | null;

  /**
   * Route path for navigation
   */
  @Column({ name: 'Route', type: 'nvarchar', length: 255, nullable: true })
  route!: string | null;

  /**
   * Parent menu item ID for hierarchical structure
   */
  @Column({ name: 'ParentId', type: 'int', nullable: true })
  parentId!: number | null;

  /**
   * Display order for sorting menu items
   */
  @Column({ name: 'DisplayOrder', type: 'int', default: 0 })
  displayOrder!: number;

  /**
   * Whether the menu item is active/visible
   */
  @Column({ name: 'IsActive', type: 'bit', default: true })
  isActive!: boolean;

  /**
   * Permission ID required to view this menu item
   */
  @Column({ name: 'PermissionId', type: 'int', nullable: true })
  permissionId!: number | null;

  /**
   * Self-referencing many-to-one relationship for parent menu item
   */
  @ManyToOne(() => MenuItem, menuItem => menuItem.children, {
    nullable: true,
    onDelete: 'NO ACTION'
  })
  @JoinColumn({ name: 'ParentId' })
  parent!: MenuItem | null;

  /**
   * Relationship to Permission entity
   */
  @ManyToOne(() => Permission, { nullable: true })
  @JoinColumn({ name: 'PermissionId' })
  permission!: Permission | null;

  /**
   * Self-referencing one-to-many relationship for child menu items
   */
  @OneToMany(() => MenuItem, menuItem => menuItem.parent, {
    cascade: true
  })
  children!: MenuItem[];

  /**
   * Check if this is a root level menu item
   */
  isRootItem(): boolean {
    return this.parentId === null;
  }

  /**
   * Check if this menu item has children
   */
  hasChildren(): boolean {
    return this.children && this.children.length > 0;
  }

  /**
   * Get the depth level of this menu item
   */
  getDepthLevel(): number {
    let depth = 0;
    let current = this.parent;
    while (current) {
      depth++;
      current = current.parent;
    }
    return depth;
  }

  /**
   * Check if menu item is navigable (has a route)
   */
  isNavigable(): boolean {
    return this.route !== null && this.route.trim() !== '';
  }

  /**
   * Get full breadcrumb path
   */
  getBreadcrumbPath(): string[] {
    const path: string[] = [];
    let current: MenuItem | null = this;

    while (current) {
      path.unshift(current.label);
      current = current.parent;
    }

    return path;
  }

  /**
   * Get all active children sorted by display order
   */
  getActiveChildren(): MenuItem[] {
    return this.children
      .filter(child => child.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  /**
   * Check if menu item should be displayed based on permissions
   * This method can be extended to include permission checking logic
   */
  canDisplay(userPermissions?: string[]): boolean {
    if (!this.isActive) {
      return false;
    }

    // Basic permission mapping based on routes
    if (userPermissions) {
      switch (this.route) {
        case '/admin':
          return userPermissions.includes('manage_users') || userPermissions.includes('ADMIN_PANEL');
        case '/upload':
          return userPermissions.includes('view_upload') || userPermissions.includes('DOCUMENT_UPLOAD');
        case '/dashboard':
          return userPermissions.includes('view_dashboard') || userPermissions.includes('MANAGEMENT_DASHBOARD');
        case '/historial':
          return userPermissions.includes('HISTORY_LOAD_COMMERCIAL_FILES');
        case '/production':
          return userPermissions.includes('view_dashboard') || userPermissions.includes('MANAGEMENT_DASHBOARD');
        default:
          return true;
      }
    }

    return true;
  }
}
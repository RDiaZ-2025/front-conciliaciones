import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { PermissionByUser } from './PermissionByUser';

/**
 * Permission entity representing system permissions
 * Maps to Permissions table in the database
 */
@Entity('Permissions')
export class Permission {
  /**
   * Primary key - Auto-incrementing permission ID
   */
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  /**
   * Permission name - must be unique
   * Examples: 'view_upload', 'view_dashboard', 'manage_users', 'ADMIN_PANEL'
   */
  @Column({ name: 'Name', type: 'varchar', length: 255, nullable: false, unique: true })
  name!: string;

  /**
   * Human-readable description of the permission
   */
  @Column({ name: 'Description', type: 'varchar', length: 500, nullable: true })
  description!: string | null;

  /**
   * Record creation timestamp
   */
  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime' })
  createdAt!: Date;

  /**
   * One-to-many relationship with user permissions
   */
  @OneToMany(() => PermissionByUser, permissionByUser => permissionByUser.permission, {
    cascade: true
  })
  userPermissions!: PermissionByUser[];

  /**
   * Check if this is an admin permission
   */
  isAdminPermission(): boolean {
    return this.name === 'ADMIN_PANEL' || this.name === 'manage_users';
  }

  /**
   * Get permission display name
   */
  getDisplayName(): string {
    return this.description || this.name;
  }
}
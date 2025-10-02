import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Unique, Index } from 'typeorm';
import { User } from './User';
import { Permission } from './Permission';

/**
 * PermissionByUser entity representing the many-to-many relationship between users and permissions
 * Maps to PermissionsByUser table in the database
 */
@Entity('PermissionsByUser')
@Unique(['userId', 'permissionId'])
@Index('IX_PermissionsByUser_UserId', ['userId'])
export class PermissionByUser {
  /**
   * Primary key - Auto-incrementing ID
   */
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  /**
   * Foreign key to User table
   */
  @Column({ name: 'UserId', type: 'int', nullable: false })
  userId!: number;

  /**
   * Foreign key to Permission table
   */
  @Column({ name: 'PermissionId', type: 'int', nullable: false })
  permissionId!: number;

  /**
   * Timestamp when permission was assigned to user
   */
  @CreateDateColumn({ name: 'AssignedAt', type: 'datetime' })
  assignedAt!: Date;

  /**
   * Many-to-one relationship with User
   */
  @ManyToOne(() => User, user => user.permissions, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'UserId' })
  user!: User;

  /**
   * Many-to-one relationship with Permission
   */
  @ManyToOne(() => Permission, permission => permission.userPermissions, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'PermissionId' })
  permission!: Permission;

  /**
   * Check if permission assignment is recent (within last 30 days)
   */
  isRecentAssignment(): boolean {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return this.assignedAt > thirtyDaysAgo;
  }

  /**
   * Get assignment age in days
   */
  getAssignmentAgeInDays(): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.assignedAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
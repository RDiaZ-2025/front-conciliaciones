import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Unique, Index } from 'typeorm';
import { User } from './User';
import { Permission } from './Permission';

@Entity('PermissionsByUser')
@Unique(['userId', 'permissionId'])
@Index('IX_PermissionsByUser_UserId', ['userId'])
export class PermissionByUser {

  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  @Column({ name: 'UserId', type: 'int', nullable: false })
  userId!: number;

  @Column({ name: 'PermissionId', type: 'int', nullable: false })
  permissionId!: number;

  @CreateDateColumn({ name: 'AssignedAt', type: 'datetime' })
  assignedAt!: Date;

  @ManyToOne(() => User, user => user.permissions, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'UserId' })
  user!: User;

  @ManyToOne(() => Permission, permission => permission.userPermissions, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'PermissionId' })
  permission!: Permission;

  isRecentAssignment(): boolean {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return this.assignedAt > thirtyDaysAgo;
  }

  getAssignmentAgeInDays(): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.assignedAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

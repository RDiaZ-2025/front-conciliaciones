import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { PermissionByUser } from './PermissionByUser';

@Entity('Permissions')
export class Permission {

  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  @Column({ name: 'Name', type: 'varchar', length: 255, nullable: false, unique: true })
  name!: string;

  @Column({ name: 'Description', type: 'varchar', length: 500, nullable: true })
  description!: string | null;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime' })
  createdAt!: Date;

  @OneToMany(() => PermissionByUser, permissionByUser => permissionByUser.permission, {
    cascade: true
  })
  userPermissions!: PermissionByUser[];

  isAdminPermission(): boolean {
    const lower = this.name ? this.name.toLowerCase() : '';
    return lower.includes('admin') || lower === 'usuarios';
  }

  getDisplayName(): string {
    return this.description || this.name;
  }
}

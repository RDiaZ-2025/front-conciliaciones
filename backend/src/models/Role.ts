import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable, OneToMany } from 'typeorm';
import { Permission } from './Permission';
import { User } from './User';

@Entity('Roles')
export class Role {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  @Column({ name: 'Name', type: 'varchar', length: 50, unique: true })
  name!: string;

  @Column({ name: 'Description', type: 'varchar', length: 255, nullable: true })
  description!: string | null;

  @ManyToMany(() => Permission)
  @JoinTable({
    name: 'RolePermissions',
    joinColumn: { name: 'RoleId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'PermissionId', referencedColumnName: 'id' }
  })
  permissions!: Permission[];

  @OneToMany(() => User, user => user.role)
  users!: User[];
}

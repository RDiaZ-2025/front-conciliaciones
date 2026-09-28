import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { Permission } from './Permission';

@Entity('MenuItems')
@Index('IX_MenuItems_DisplayOrder', ['displayOrder', 'isActive'])
export class MenuItem {

  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  @Column({ name: 'Label', type: 'nvarchar', length: 100, nullable: false })
  label!: string;

  @Column({ name: 'Icon', type: 'nvarchar', length: 50, nullable: true })
  icon!: string | null;

  @Column({ name: 'Route', type: 'nvarchar', length: 255, nullable: true })
  route!: string | null;

  @Column({ name: 'ParentId', type: 'int', nullable: true })
  parentId!: number | null;

  @Column({ name: 'DisplayOrder', type: 'int', default: 0 })
  displayOrder!: number;

  @Column({ name: 'IsActive', type: 'bit', default: true })
  isActive!: boolean;

  @Column({ name: 'PermissionId', type: 'int', nullable: true })
  permissionId!: number | null;

  @Column({ name: 'Project', type: 'nvarchar', length: 10, default: 'voc', nullable: false })
  project!: string;

  @ManyToOne(() => MenuItem, menuItem => menuItem.children, {
    nullable: true,
    onDelete: 'NO ACTION'
  })
  @JoinColumn({ name: 'ParentId' })
  parent!: MenuItem | null;

  @ManyToOne(() => Permission, { nullable: true })
  @JoinColumn({ name: 'PermissionId' })
  permission!: Permission | null;

  @OneToMany(() => MenuItem, menuItem => menuItem.parent, {
    cascade: true
  })
  children!: MenuItem[];

  isRootItem(): boolean {
    return this.parentId === null;
  }

  hasChildren(): boolean {
    return this.children && this.children.length > 0;
  }

  getDepthLevel(): number {
    let depth = 0;
    let current = this.parent;
    while (current) {
      depth++;
      current = current.parent;
    }
    return depth;
  }

  isNavigable(): boolean {
    return this.route !== null && this.route.trim() !== '';
  }

  getBreadcrumbPath(): string[] {
    const path: string[] = [];
    let current: MenuItem | null = this;

    while (current) {
      path.unshift(current.label);
      current = current.parent;
    }

    return path;
  }

  getActiveChildren(): MenuItem[] {
    return this.children
      .filter(child => child.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  canDisplay(userPermissions?: string[]): boolean {
    if (!this.isActive) {
      return false;
    }

    const permName = this.permission?.name;
    if (!userPermissions || !permName) {
      return true;
    }

    return userPermissions.some(p => p.toLowerCase() === permName.toLowerCase());
  }
}

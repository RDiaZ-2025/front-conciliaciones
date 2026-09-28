import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index, ManyToOne, JoinColumn } from 'typeorm';
import { PermissionByUser } from './PermissionByUser';
import { Notification } from './Notification';
import { Team } from './Team';

@Entity('Users')
@Index('IX_Users_Email', ['email'])
@Index('IX_Users_LastAccess', ['lastAccess'])
export class User {

    @PrimaryGeneratedColumn({ name: 'Id' })
    id!: number;

    @Column({ name: 'Name', type: 'varchar', length: 255, nullable: false })
    name!: string;

    @Column({ name: 'Email', type: 'varchar', length: 255, nullable: false, unique: true })
    email!: string;

    @Column({ name: 'PasswordHash', type: 'varchar', length: 255, nullable: false })
    passwordHash!: string;

    @Column({ name: 'LastAccess', type: 'datetime', nullable: true })
    lastAccess!: Date | null;

    @Column({ name: 'Status', type: 'int', nullable: false, default: 1 })
    status!: number;

    @Column({ name: 'Role', type: 'varchar', length: 255, nullable: true, default: 'user' })
    role!: string;

    @Column({ name: 'Permissions', type: 'varchar', length: 500, nullable: true, default: '' })
    permissionsStr!: string;

    @Column({ name: 'TeamId', type: 'int', nullable: true })
    teamId!: number | null;

    @Column({ name: 'BossId', type: 'int', nullable: true })
    bossId!: number | null;

    @CreateDateColumn({ name: 'CreatedAt', type: 'datetime' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'UpdatedAt', type: 'datetime' })
    updatedAt!: Date;

    @OneToMany(() => PermissionByUser, permissionByUser => permissionByUser.user, {
        cascade: true
    })
    permissions!: PermissionByUser[];

    @ManyToOne(() => Team, team => team.users)
    @JoinColumn({ name: 'TeamId' })
    team!: Team;

    @ManyToOne(() => User, user => user.subordinates)
    @JoinColumn({ name: 'BossId' })
    boss!: User;

    @OneToMany(() => User, user => user.boss)
    subordinates!: User[];

    @OneToMany(() => Notification, notification => notification.user)
    notifications!: Notification[];

    isActive(): boolean {
        return this.status === 1;
    }

    updateLastAccess(): void {
        this.lastAccess = new Date();
    }
}

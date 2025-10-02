import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { PermissionByUser } from './PermissionByUser';
import { LoadDocumentsOCbyUser } from './LoadDocumentsOCbyUser';

/**
 * User entity representing system users
 * Maps to USERS table in the database
 */
@Entity('Users')
@Index('IX_Users_Email', ['email'])
@Index('IX_Users_LastAccess', ['lastAccess'])
export class User {
    /**
     * Primary key - Auto-incrementing user ID
     */
    @PrimaryGeneratedColumn({ name: 'Id' })
    id!: number;

    /**
     * User's full name
     */
    @Column({ name: 'Name', type: 'varchar', length: 255, nullable: false })
    name!: string;

    /**
     * User's email address (unique)
     */
    @Column({ name: 'Email', type: 'varchar', length: 255, nullable: false, unique: true })
    email!: string;

    /**
     * Hashed password
     */
    @Column({ name: 'PasswordHash', type: 'varchar', length: 255, nullable: false })
    passwordHash!: string;

    /**
     * Last access timestamp
     */
    @Column({ name: 'LastAccess', type: 'datetime', nullable: true })
    lastAccess!: Date | null;

    /**
     * User status (1 = active, 0 = inactive)
     */
    @Column({ name: 'Status', type: 'int', nullable: false, default: 1 })
    status!: number;

    /**
     * Record creation timestamp
     */
    @CreateDateColumn({ name: 'CreatedAt', type: 'datetime' })
    createdAt!: Date;

    /**
     * Record last update timestamp
     */
    @UpdateDateColumn({ name: 'UpdatedAt', type: 'datetime' })
    updatedAt!: Date;

    /**
     * One-to-many relationship with user permissions
     */
    @OneToMany(() => PermissionByUser, permissionByUser => permissionByUser.user, {
        cascade: true
    })
    permissions!: PermissionByUser[];

    /**
     * One-to-many relationship with document loads
     */
    @OneToMany(() => LoadDocumentsOCbyUser, loadDocument => loadDocument.user)
    documentLoads!: LoadDocumentsOCbyUser[];

    /**
     * Check if user is active
     */
    isActive(): boolean {
        return this.status === 1;
    }

    /**
     * Update last access timestamp
     */
    updateLastAccess(): void {
        this.lastAccess = new Date();
    }
}
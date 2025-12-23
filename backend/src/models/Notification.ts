import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './User';

/**
 * Notification entity representing user notifications
 * Maps to NOTIFICATIONS table in the database
 */
@Entity('Notifications')
@Index('IX_Notifications_UserId', ['userId'])
@Index('IX_Notifications_IsRead', ['isRead'])
export class Notification {
    /**
     * Primary key - Auto-incrementing notification ID
     */
    @PrimaryGeneratedColumn({ name: 'Id' })
    id!: number;

    /**
     * Foreign key to User table
     */
    @Column({ name: 'UserId', type: 'int', nullable: false })
    userId!: number;

    /**
     * Notification title
     */
    @Column({ name: 'Title', type: 'varchar', length: 255, nullable: false })
    title!: string;

    /**
     * Notification message content
     */
    @Column({ name: 'Message', type: 'text', nullable: false })
    message!: string;

    /**
     * Notification type (info, success, warning, error)
     */
    @Column({ name: 'Type', type: 'varchar', length: 50, nullable: false, default: 'info' })
    type!: string;

    /**
     * Read status (0 = unread, 1 = read)
     */
    @Column({ name: 'IsRead', type: 'bit', nullable: false, default: 0 })
    isRead!: boolean;

    /**
     * Record creation timestamp
     */
    @CreateDateColumn({ name: 'CreatedAt', type: 'datetime' })
    createdAt!: Date;

    /**
     * Many-to-one relationship with User
     */
    @ManyToOne(() => User, user => user.notifications, {
        onDelete: 'CASCADE' // If user is deleted, delete their notifications
    })
    @JoinColumn({ name: 'UserId' })
    user!: User;
}

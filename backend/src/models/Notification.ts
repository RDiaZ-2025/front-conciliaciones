import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './User';

@Entity('Notifications')
@Index('IX_Notifications_UserId', ['userId'])
@Index('IX_Notifications_IsRead', ['isRead'])
export class Notification {

    @PrimaryGeneratedColumn({ name: 'Id' })
    id!: number;

    @Column({ name: 'UserId', type: 'int', nullable: false })
    userId!: number;

    @Column({ name: 'Title', type: 'varchar', length: 255, nullable: false })
    title!: string;

    @Column({ name: 'Message', type: 'text', nullable: false })
    message!: string;

    @Column({ name: 'Type', type: 'varchar', length: 50, nullable: false, default: 'info' })
    type!: string;

    @Column({ name: 'IsRead', type: 'bit', nullable: false, default: 0 })
    isRead!: boolean;

    @CreateDateColumn({ name: 'CreatedAt', type: 'datetime' })
    createdAt!: Date;

    @ManyToOne(() => User, user => user.notifications, {
        onDelete: 'CASCADE'
    })
    @JoinColumn({ name: 'UserId' })
    user!: User;
}

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Unique, Index } from 'typeorm';
import { Subteam } from './Subteam';
import { User } from './User';

@Entity('SubteamUsers')
@Unique(['subteamId', 'userId'])
@Index('IX_SubteamUsers_SubteamId', ['subteamId'])
@Index('IX_SubteamUsers_UserId', ['userId'])
export class SubteamUser {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  @Column({ name: 'SubteamId', type: 'int', nullable: false })
  subteamId!: number;

  @Column({ name: 'UserId', type: 'int', nullable: false })
  userId!: number;

  @CreateDateColumn({ name: 'AssignedAt', type: 'datetime' })
  assignedAt!: Date;

  @ManyToOne(() => Subteam, subteam => subteam.subteamUsers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'SubteamId' })
  subteam!: Subteam;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'UserId' })
  user!: User;
}

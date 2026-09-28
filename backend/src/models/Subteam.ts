import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { Team } from './Team';
import { User } from './User';
import { SubteamUser } from './SubteamUser';

@Entity('Subteams')
@Index('IX_Subteams_TeamId', ['teamId'])
export class Subteam {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  @Column({ name: 'TeamId', type: 'int', nullable: false })
  teamId!: number;

  @Column({ name: 'Name', type: 'nvarchar', length: 255, nullable: false })
  name!: string;

  @Column({ name: 'Description', type: 'nvarchar', length: 500, nullable: true })
  description!: string | null;

  @Column({ name: 'LeaderId', type: 'int', nullable: true })
  leaderId!: number | null;

  @Column({ name: 'IsActive', type: 'bit', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'UpdatedAt', type: 'datetime' })
  updatedAt!: Date;

  @ManyToOne(() => Team, team => team.subteams, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'TeamId' })
  team!: Team;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'LeaderId' })
  leader?: User | null;

  @OneToMany(() => SubteamUser, subteamUser => subteamUser.subteam, { cascade: true })
  subteamUsers!: SubteamUser[];
}

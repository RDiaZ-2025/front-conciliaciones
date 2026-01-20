import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('Statuses')
export class Status {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  @Column({ name: 'Name', type: 'nvarchar', length: 50, nullable: false })
  name!: string;

  @Column({ name: 'Code', type: 'varchar', length: 50, nullable: false, unique: true })
  code!: string;

  @Column({ name: 'Order', type: 'int', nullable: false, default: 0 })
  order!: number;
}

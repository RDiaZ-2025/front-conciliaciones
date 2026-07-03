import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('ProductionRequestTypes')
export class ProductionRequestType {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  @Column({ name: 'Name', type: 'nvarchar', length: 255, nullable: false })
  name!: string;

  @Column({ name: 'Responsible', type: 'nvarchar', length: 255, nullable: false })
  responsible!: string;

  @Column({ name: 'Role', type: 'nvarchar', length: 255, nullable: false })
  role!: string;

  @Column({ name: 'Email', type: 'nvarchar', length: 255, nullable: false })
  email!: string;

  @Column({ name: 'Phone', type: 'nvarchar', length: 50, nullable: false })
  phone!: string;
}

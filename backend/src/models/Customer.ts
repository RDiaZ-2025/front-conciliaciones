import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';

@Entity('Customers')
@Unique(['documentType', 'documentNumber'])
export class Customer {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  @Column({ name: 'DocumentType', type: 'nvarchar', length: 50, nullable: false })
  documentType!: string;

  @Column({ name: 'DocumentNumber', type: 'nvarchar', length: 50, nullable: false })
  documentNumber!: string;

  @Column({ name: 'BusinessName', type: 'nvarchar', length: 255, nullable: true })
  businessName!: string | null;

  @Column({ name: 'Email', type: 'nvarchar', length: 255, nullable: false })
  email!: string;

  @Column({ name: 'PhoneNumber', type: 'nvarchar', length: 50, nullable: true })
  phoneNumber!: string | null;

  @Column({ name: 'IsActive', type: 'bit', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'UpdatedAt', type: 'datetime' })
  updatedAt!: Date;
}

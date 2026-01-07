import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { ProductionRequest } from './ProductionRequest';
import { User } from './User';

@Entity('ProductionRequestHistories')
export class ProductionRequestHistory {
    @PrimaryGeneratedColumn({ name: 'Id' })
    id!: number;

    @Column({ name: 'ProductionRequestId', type: 'int', nullable: false })
    productionRequestId!: number;

    @ManyToOne(() => ProductionRequest)
    @JoinColumn({ name: 'ProductionRequestId' })
    productionRequest!: ProductionRequest;

    @Column({ name: 'ChangeField', type: 'nvarchar', length: 255, nullable: false })
    changeField!: string;

    @Column({ name: 'OldValue', type: 'nvarchar', length: 'MAX', nullable: true })
    oldValue!: string | null;

    @Column({ name: 'NewValue', type: 'nvarchar', length: 'MAX', nullable: true })
    newValue!: string | null;

    @Column({ name: 'ChangedBy', type: 'int', nullable: false })
    changedBy!: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'ChangedBy' })
    changedByUser!: User;

    @Column({ name: 'ChangeType', type: 'nvarchar', length: 50, nullable: false })
    changeType!: string;

    @CreateDateColumn({ name: 'CreatedAt', type: 'datetime' })
    createdAt!: Date;
}

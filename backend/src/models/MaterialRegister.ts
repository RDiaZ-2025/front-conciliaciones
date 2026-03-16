import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { ProductionRequest } from './ProductionRequest';
import { User } from './User';

@Entity('MaterialRegisters')
export class MaterialRegister {
    @PrimaryGeneratedColumn({ name: 'Id' })
    id!: number;

    @Column({ name: 'ProductionRequestId', type: 'int', nullable: false })
    productionRequestId!: number;

    @ManyToOne(() => ProductionRequest, request => request.materialRegisters, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'ProductionRequestId' })
    productionRequest!: ProductionRequest;

    @Column({ name: 'Category', type: 'nvarchar', length: 100, nullable: false })
    category!: string;

    @Column({ name: 'Type', type: 'nvarchar', length: 100, nullable: false })
    type!: string;

    @Column({ name: 'Solution', type: 'nvarchar', length: 100, nullable: false })
    solution!: string;

    @Column({ name: 'JsonRequest', type: 'nvarchar', length: 'MAX', nullable: false })
    jsonRequest!: string;

    @CreateDateColumn({ name: 'CreatedAt', type: 'datetime' })
    createdAt!: Date;

    @Column({ name: 'CreatedBy', type: 'int', nullable: false })
    createdBy!: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'CreatedBy' })
    creator!: User;
}

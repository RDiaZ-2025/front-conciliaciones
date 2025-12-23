import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { ProductionRequest } from './ProductionRequest';

/**
 * CustomerData entity representing customer information for a production request
 */
@Entity('CustomerData')
export class CustomerData {
    @PrimaryGeneratedColumn({ name: 'Id' })
    id!: number;

    @Column({ name: 'ProductionRequestId', type: 'int', nullable: false, unique: true })
    productionRequestId!: number;

    @OneToOne(() => ProductionRequest, request => request.customerData, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'ProductionRequestId' })
    productionRequest!: ProductionRequest;

    @Column({ name: 'RequestDate', type: 'datetime', nullable: true })
    requestDate!: Date;

    @Column({ name: 'DeliveryDate', type: 'datetime', nullable: true })
    deliveryDate!: Date;

    @Column({ name: 'ClientAgency', type: 'nvarchar', length: 255, nullable: true })
    clientAgency!: string;

    @Column({ name: 'RequesterName', type: 'nvarchar', length: 255, nullable: true })
    requesterName!: string;

    @Column({ name: 'RequesterEmail', type: 'nvarchar', length: 255, nullable: true })
    requesterEmail!: string;

    @Column({ name: 'RequesterPhone', type: 'nvarchar', length: 50, nullable: true })
    requesterPhone!: string;

    @Column({ name: 'BusinessName', type: 'nvarchar', length: 255, nullable: true })
    businessName!: string;

    @Column({ name: 'NIT', type: 'nvarchar', length: 50, nullable: true })
    nit!: string;

    @Column({ name: 'ServiceStrategy', type: 'bit', default: 0 })
    serviceStrategy!: boolean;

    @Column({ name: 'ServiceTactical', type: 'bit', default: 0 })
    serviceTactical!: boolean;

    @Column({ name: 'ServiceProduction', type: 'bit', default: 0 })
    serviceProduction!: boolean;

    @Column({ name: 'ServiceData', type: 'bit', default: 0 })
    serviceData!: boolean;
}

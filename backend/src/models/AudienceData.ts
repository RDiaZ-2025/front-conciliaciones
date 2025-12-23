import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { ProductionRequest } from './ProductionRequest';

/**
 * AudienceData entity representing audience and context for a production request
 */
@Entity('AudienceData')
export class AudienceData {
    @PrimaryGeneratedColumn({ name: 'Id' })
    id!: number;

    @Column({ name: 'ProductionRequestId', type: 'int', nullable: false, unique: true })
    productionRequestId!: number;

    @OneToOne(() => ProductionRequest, request => request.audienceData, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'ProductionRequestId' })
    productionRequest!: ProductionRequest;

    @Column({ name: 'Gender', type: 'nvarchar', length: 100, nullable: true })
    gender!: string;

    @Column({ name: 'Geo', type: 'nvarchar', length: 255, nullable: true })
    geo!: string;

    @Column({ name: 'AgeRange', type: 'nvarchar', length: 100, nullable: true })
    ageRange!: string;

    @Column({ name: 'SocioEconomicLevel', type: 'nvarchar', length: 100, nullable: true })
    socioEconomicLevel!: string;

    @Column({ name: 'Interests', type: 'nvarchar', length: 'MAX', nullable: true })
    interests!: string;

    @Column({ name: 'SpecificDetails', type: 'nvarchar', length: 'MAX', nullable: true })
    specificDetails!: string;

    @Column({ name: 'CampaignContext', type: 'nvarchar', length: 'MAX', nullable: true })
    campaignContext!: string;

    @Column({ name: 'CampaignConcept', type: 'nvarchar', length: 'MAX', nullable: true })
    campaignConcept!: string;

    @Column({ name: 'Assets', type: 'nvarchar', length: 'MAX', nullable: true })
    assets!: string;
}

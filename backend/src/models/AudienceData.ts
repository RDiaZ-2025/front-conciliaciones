import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, ManyToOne } from 'typeorm';
import { ProductionRequest } from './ProductionRequest';
import { Gender } from './Gender';
import { AgeRange } from './AgeRange';
import { SocioeconomicLevel } from './SocioeconomicLevel';

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

    @Column({ name: 'GenderId', type: 'int', nullable: true })
    genderId!: number;

    @ManyToOne(() => Gender)
    @JoinColumn({ name: 'GenderId' })
    gender!: Gender;

    @Column({ name: 'Geo', type: 'nvarchar', length: 255, nullable: true })
    geo!: string;

    @Column({ name: 'AgeRangeId', type: 'int', nullable: true })
    ageRangeId!: number;

    @ManyToOne(() => AgeRange)
    @JoinColumn({ name: 'AgeRangeId' })
    ageRange!: AgeRange;

    @Column({ name: 'SocioEconomicLevelId', type: 'int', nullable: true })
    socioEconomicLevelId!: number;

    @ManyToOne(() => SocioeconomicLevel)
    @JoinColumn({ name: 'SocioEconomicLevelId' })
    socioEconomicLevel!: SocioeconomicLevel;

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

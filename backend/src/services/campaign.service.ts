import { Repository } from 'typeorm';
import { AppDataSource } from '../config/typeorm.config';
import { Campaign } from '../models/Campaign';
import { User } from '../models/User';

export class CampaignService {
    private campaignRepository: Repository<Campaign>;

    constructor() {
        this.campaignRepository = AppDataSource.getRepository(Campaign);
    }

    async findAll(): Promise<Campaign[]> {
        return await this.campaignRepository.find({
            relations: ['team', 'creator'],
            order: { createdAt: 'DESC' }
        });
    }

    async findById(id: number): Promise<Campaign | null> {
        return await this.campaignRepository.findOne({
            where: { id },
            relations: ['team', 'creator']
        });
    }

    async create(data: Partial<Campaign>, userId: number): Promise<Campaign> {
        const campaign = this.campaignRepository.create({
            ...data,
            createdBy: userId,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        
        // Ensure impacts is stringified if it's an object/array
        if (data.impacts && typeof data.impacts !== 'string') {
            campaign.impacts = JSON.stringify(data.impacts);
        }

        return await this.campaignRepository.save(campaign);
    }

    async update(id: number, data: Partial<Campaign>): Promise<Campaign | null> {
        const campaign = await this.findById(id);
        if (!campaign) return null;

        if (data.impacts && typeof data.impacts !== 'string') {
            data.impacts = JSON.stringify(data.impacts);
        }

        this.campaignRepository.merge(campaign, {
            ...data,
            updatedAt: new Date()
        });

        return await this.campaignRepository.save(campaign);
    }

    async delete(id: number): Promise<boolean> {
        const result = await this.campaignRepository.delete(id);
        return result.affected !== 0;
    }
}

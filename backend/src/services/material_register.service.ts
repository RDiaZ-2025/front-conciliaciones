import { Repository } from 'typeorm';
import { AppDataSource } from '../config/typeorm.config';
import { MaterialRegister } from '../models/MaterialRegister';
import { ProductionRequest } from '../models/ProductionRequest';

export class MaterialRegisterService {
    private materialRegisterRepository: Repository<MaterialRegister>;

    constructor() {
        this.materialRegisterRepository = AppDataSource.getRepository(MaterialRegister);
    }

    async create(data: Partial<MaterialRegister>): Promise<MaterialRegister> {
        if (!AppDataSource.isInitialized) {
            throw new Error('Database not available');
        }

        const productionRequestRepository = AppDataSource.getRepository(ProductionRequest);
        const request = await productionRequestRepository.findOne({ where: { id: data.productionRequestId } });

        if (!request) {
            throw new Error('Production request not found');
        }

        const register = this.materialRegisterRepository.create({
            ...data,
            createdAt: new Date()
        });
        return await this.materialRegisterRepository.save(register);
    }

    async findByProductionRequestId(productionRequestId: number): Promise<MaterialRegister[]> {
        if (!AppDataSource.isInitialized) {
            throw new Error('Database not available');
        }

        return await this.materialRegisterRepository.find({
            where: { productionRequestId },
            order: { createdAt: 'DESC' },
            relations: ['creator']
        });
    }
}

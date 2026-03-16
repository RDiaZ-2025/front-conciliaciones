import { Repository } from 'typeorm';
import { AppDataSource } from '../config/typeorm.config';
import { MaterialRegister } from '../models/MaterialRegister';

export class MaterialRegisterService {
    private materialRegisterRepository: Repository<MaterialRegister>;

    constructor() {
        this.materialRegisterRepository = AppDataSource.getRepository(MaterialRegister);
    }

    async create(data: Partial<MaterialRegister>): Promise<MaterialRegister> {
        const register = this.materialRegisterRepository.create({
            ...data,
            createdAt: new Date()
        });
        return await this.materialRegisterRepository.save(register);
    }

    async findByProductionRequestId(productionRequestId: number): Promise<MaterialRegister[]> {
        return await this.materialRegisterRepository.find({
            where: { productionRequestId },
            order: { createdAt: 'DESC' },
            relations: ['creator']
        });
    }
}

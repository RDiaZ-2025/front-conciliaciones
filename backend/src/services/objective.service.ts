import { AppDataSource } from '../config/typeorm.config';
import { Objective } from '../models/Objective';

export class ObjectiveService {
  async getObjectives(): Promise<Objective[]> {
    if (!AppDataSource.isInitialized) {
      throw new Error('Database not available');
    }
    const objectiveRepository = AppDataSource.getRepository(Objective);
    return await objectiveRepository.find();
  }
}

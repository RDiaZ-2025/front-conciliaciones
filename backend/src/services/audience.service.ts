import { AppDataSource } from '../config/typeorm.config';
import { Gender } from '../models/Gender';
import { AgeRange } from '../models/AgeRange';
import { SocioeconomicLevel } from '../models/SocioeconomicLevel';

export class AudienceService {
  async getGenders(): Promise<Gender[]> {
    if (!AppDataSource.isInitialized) {
      throw new Error('Database not available');
    }
    const repo = AppDataSource.getRepository(Gender);
    return await repo.find();
  }

  async getAgeRanges(): Promise<AgeRange[]> {
    if (!AppDataSource.isInitialized) {
      throw new Error('Database not available');
    }
    const repo = AppDataSource.getRepository(AgeRange);
    return await repo.find();
  }

  async getSocioeconomicLevels(): Promise<SocioeconomicLevel[]> {
    if (!AppDataSource.isInitialized) {
      throw new Error('Database not available');
    }
    const repo = AppDataSource.getRepository(SocioeconomicLevel);
    return await repo.find();
  }
}

import { AppDataSource } from '../config/typeorm.config';
import { Cover15Minute } from '../models/Cover15Minute';

export class Cover15MinuteService {
  private repository = AppDataSource.getRepository(Cover15Minute);

  async saveCover(uploaderLog: string, url: string): Promise<Cover15Minute> {
    const cover = new Cover15Minute();
    cover.uploaderLog = uploaderLog;
    cover.url = url;
    cover.timestamp = new Date();

    return await this.repository.save(cover);
  }

  async getAllCovers(): Promise<Cover15Minute[]> {
    return await this.repository.find({
      order: {
        timestamp: 'DESC'
      }
    });
  }
}
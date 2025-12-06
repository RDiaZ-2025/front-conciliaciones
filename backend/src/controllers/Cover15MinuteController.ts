import { Request, Response } from 'express';
import { Cover15MinuteService } from '../services/Cover15MinuteService';

export class Cover15MinuteController {
  private service: Cover15MinuteService;

  constructor() {
    this.service = new Cover15MinuteService();
  }

  saveCover = async (req: Request, res: Response): Promise<void> => {
    try {
      const { uploaderLog, url } = req.body;
      
      if (!uploaderLog || !url) {
        res.status(400).json({ success: false, message: 'Missing required fields' });
        return;
      }

      const cover = await this.service.saveCover(uploaderLog, url);
      res.status(201).json({ success: true, data: cover });
    } catch (error: any) {
      console.error('Error saving cover:', error);
      res.status(500).json({ success: false, message: 'Error saving cover', error: error.message });
    }
  };

  getAllCovers = async (req: Request, res: Response): Promise<void> => {
    try {
      const covers = await this.service.getAllCovers();
      res.status(200).json({ success: true, data: covers });
    } catch (error: any) {
      console.error('Error fetching covers:', error);
      res.status(500).json({ success: false, message: 'Error fetching covers', error: error.message });
    }
  };
}

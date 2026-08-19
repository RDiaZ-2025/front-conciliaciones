import { Request, Response } from 'express';
import { Cover15MinuteService } from '../services/cover_15_minute.service';
import { asyncHandler } from "../utils/asyncHandler";

export class Cover15MinuteController {
  private service: Cover15MinuteService;

  constructor() {
    this.service = new Cover15MinuteService();
  }

  saveCover = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { uploaderLog, url } = req.body;

    if (!uploaderLog || !url) {
      res.status(400).json({ success: false, message: 'Missing required fields' });
      return;
    }

    const cover = await this.service.saveCover(uploaderLog, url);
    res.status(201).json({ success: true, data: cover });
  });

  getAllCovers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const covers = await this.service.getAllCovers();
    res.status(200).json({ success: true, data: covers });
  });
}

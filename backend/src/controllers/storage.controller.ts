import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { storageService } from '../services/storage.service';

export class StorageController {
  generateSasToken = asyncHandler(async (req: Request, res: Response) => {
    try {
      const containerName = req.query.container as string;
      const data = storageService.generateSasToken(containerName, req.user);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      const status = error.statusCode || (error.message.includes('missing') ? 500 : 400);
      return res.status(status).json({
        success: false,
        message: error.message
      });
    }
  });

  listCommercialFiles = asyncHandler(async (req: Request, res: Response) => {
    const folderPath = (req.query.path as string) || '';
    const files = await storageService.listCommercialFiles(folderPath);
    return res.json({ success: true, data: files });
  });

  downloadCommercialFile = asyncHandler(async (req: Request, res: Response) => {
    const filePath = req.query.path as string;
    if (!filePath) return res.status(400).json({ message: 'Path required' });

    const downloadResult = await storageService.getCommercialFileDownload(filePath);
    if (!downloadResult) {
      return res.status(404).send('File not found or content not available');
    }

    res.setHeader('Content-Disposition', `attachment; filename="${downloadResult.fileName}"`);
    res.setHeader('Content-Type', downloadResult.contentType);

    downloadResult.stream.pipe(res);
    return res;
  });
}

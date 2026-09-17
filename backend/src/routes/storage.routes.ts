import { Router } from 'express';
import { StorageController } from '../controllers/storage.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const storageController = new StorageController();

router.get('/sas-token', authenticateToken, storageController.generateSasToken);

router.get('/commercial/files', authenticateToken, storageController.listCommercialFiles);
router.get('/commercial/download', authenticateToken, storageController.downloadCommercialFile);

export default router;

import { Router } from 'express';
import { StorageController } from '../controllers/storage.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const storageController = new StorageController();

// Endpoint to get SAS token
// Protected by authentication middleware to ensure only authorized users can upload
router.get('/sas-token', authenticateToken, storageController.generateSasToken);

// Commercial endpoints (Proxy to avoid CORS)
router.get('/commercial/files', authenticateToken, storageController.listCommercialFiles);
router.get('/commercial/download', authenticateToken, storageController.downloadCommercialFile);

export default router;

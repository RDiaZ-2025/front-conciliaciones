import { Router } from 'express';
import { StorageController } from '../controllers/storageController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Endpoint to get SAS token
// Protected by authentication middleware to ensure only authorized users can upload
router.get('/sas-token', authenticateToken, StorageController.generateSasToken);

export default router;

import express from 'express';
import { LoadDocumentsOCbyUserController } from '../controllers/LoadDocumentsOCbyUserController';
import { authenticateToken, requirePermission, requireAnyPermission } from '../middleware/auth';

const router = express.Router();

// Registrar documento subido por usuario
router.post('/', authenticateToken, requirePermission('document_upload'), LoadDocumentsOCbyUserController.registerUpload);

// Consultar documentos subidos por usuario
router.get('/', authenticateToken, requireAnyPermission(['management_dashboard', 'HISTORY_LOAD_COMMERCIAL_FILES']), LoadDocumentsOCbyUserController.getUploads);

export default router;
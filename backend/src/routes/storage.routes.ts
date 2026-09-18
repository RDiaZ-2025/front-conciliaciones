import { Router, Request, Response, NextFunction } from 'express';
import { StorageController } from '../controllers/storage.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const storageController = new StorageController();

const requireCommercialAccess = (req: Request, res: Response, next: NextFunction): void => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }
  if (user.role?.toLowerCase() === 'admin') {
    next();
    return;
  }
  const perms: string[] = user.permissions || [];
  const allowed = [
    'repositorio comercial',
    'repositoriocomercial',
    'view_commercial',
    'admin_panel',
    'historial_carga_archivos_comerciales'
  ];
  const hasAccess = allowed.some(p => perms.some(userP => userP.toLowerCase() === p.toLowerCase()));
  if (!hasAccess) {
    res.status(403).json({ success: false, message: 'Access denied: Repositorio Comercial permission required' });
    return;
  }
  next();
};

// Endpoint to get SAS token
// Protected by authentication middleware to ensure only authorized users can upload
router.get('/sas-token', authenticateToken, storageController.generateSasToken);

// Commercial endpoints (Proxy to avoid CORS)
router.get('/commercial/files', authenticateToken, requireCommercialAccess, storageController.listCommercialFiles);
router.get('/commercial/download', authenticateToken, requireCommercialAccess, storageController.downloadCommercialFile);

export default router;

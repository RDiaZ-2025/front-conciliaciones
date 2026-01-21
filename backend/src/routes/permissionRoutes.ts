import { Router } from 'express';
import { 
  getAllPermissions, 
  createPermission, 
  updatePermission, 
  deletePermission 
} from '../controllers/permissionController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, getAllPermissions);
router.post('/', authenticateToken, createPermission);
router.put('/:id', authenticateToken, updatePermission);
router.delete('/:id', authenticateToken, deletePermission);

export default router;

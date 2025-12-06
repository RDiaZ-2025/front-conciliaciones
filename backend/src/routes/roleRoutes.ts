import { Router } from 'express';
import { RoleController } from '../controllers/roleController';
import { authenticateToken, requirePermission } from '../middleware/auth';

const router = Router();

// All role routes require authentication
router.use(authenticateToken);

// Get all roles - accessible by users with 'admin_panel' permission or similar
// For now, let's say 'admin_panel' is enough to view roles
router.get('/', requirePermission('admin_panel'), RoleController.getAllRoles);

router.get('/:id', requirePermission('admin_panel'), RoleController.getRoleById);

export default router;

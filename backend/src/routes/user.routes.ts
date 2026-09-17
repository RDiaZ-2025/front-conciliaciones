import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticateToken, requirePermission, requireAnyPermission } from '../middleware/auth';

const router = Router();
const userController = new UserController();

router.use(authenticateToken);

router.get('/', requireAnyPermission(['usuarios', 'admin_panel']), userController.getUsers);

router.get('/permissions/all', requireAnyPermission(['usuarios', 'admin_panel']), userController.getAllPermissions);

router.get('/:id', requireAnyPermission(['usuarios', 'admin_panel']), userController.getUserById);

router.post('/', requireAnyPermission(['usuarios', 'admin_panel']), userController.createUser);

router.put('/:id', requireAnyPermission(['usuarios', 'admin_panel']), userController.updateUser);

router.put('/:id/toggle-status', requireAnyPermission(['usuarios', 'admin_panel']), userController.toggleUserStatus);

router.put('/:id/permissions', requireAnyPermission(['usuarios', 'admin_panel']), userController.updateUserPermissions);

router.delete('/:id', requireAnyPermission(['usuarios', 'admin_panel']), userController.deleteUser);

export default router;

import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticateToken, requirePermission, requireAnyPermission } from '../middleware/auth';

const router = Router();
const userController = new UserController();

// Todas las rutas requieren autenticación obligatoria
router.use(authenticateToken);

// Obtener todos los usuarios - requiere permiso de administración
router.get('/', requirePermission('admin_panel'), userController.getUsers);

// Obtener todos los permisos disponibles
router.get('/permissions/all', requirePermission('admin_panel'), userController.getAllPermissions);

// Obtener usuario por ID - requiere permiso de lectura de usuarios
router.get('/:id', requirePermission('admin_panel'), userController.getUserById);

// Crear nuevo usuario - requiere permiso de creación de usuarios
router.post('/', requirePermission('admin_panel'), userController.createUser);

// Actualizar usuario - requiere permiso de edición de usuarios
router.put('/:id', requirePermission('admin_panel'), userController.updateUser);

// Habilitar/deshabilitar usuario - requiere permiso de edición de usuarios
router.put('/:id/toggle-status', requirePermission('admin_panel'), userController.toggleUserStatus);

// Actualizar permisos de usuario - requiere permiso de gestión de permisos
router.put('/:id/permissions', requirePermission('admin_panel'), userController.updateUserPermissions);

// Eliminar usuario - requiere permiso de administración
router.delete('/:id', requirePermission('admin_panel'), userController.deleteUser);

export default router;
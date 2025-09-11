import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticateToken, requirePermission, requireAnyPermission } from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener todos los usuarios - requiere permiso de lectura de usuarios
router.get('/', requirePermission('admin_panel'), UserController.getUsers);

// Obtener usuario por ID - requiere permiso de lectura de usuarios
router.get('/:id', requirePermission('admin_panel'), UserController.getUserById);

// Crear nuevo usuario - requiere permiso de creación de usuarios
router.post('/', requirePermission('admin_panel'), UserController.createUser);

// Actualizar usuario - requiere permiso de edición de usuarios
router.put('/:id', requirePermission('admin_panel'), UserController.updateUser);

// Habilitar/deshabilitar usuario - requiere permiso de edición de usuarios
router.put('/:id/toggle-status', requirePermission('admin_panel'), UserController.toggleUserStatus);

// Actualizar permisos de usuario - requiere permiso de gestión de permisos
router.put('/:id/permissions', requirePermission('admin_panel'), UserController.updateUserPermissions);

// Obtener todos los permisos disponibles - requiere cualquier permiso de gestión
router.get('/permissions/all', requirePermission('admin_panel'), UserController.getAllPermissions);

export default router;
import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticateToken, requirePermission, requireAnyPermission } from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener todos los usuarios - requiere permiso de lectura de usuarios
router.get('/', requirePermission('VIEW_USERS'), UserController.getUsers);

// Obtener usuario por ID - requiere permiso de lectura de usuarios
router.get('/:id', requirePermission('VIEW_USERS'), UserController.getUserById);

// Crear nuevo usuario - requiere permiso de creación de usuarios
router.post('/', requirePermission('CREATE_USER'), UserController.createUser);

// Actualizar usuario - requiere permiso de edición de usuarios
router.put('/:id', requirePermission('EDIT_USER'), UserController.updateUser);

// Habilitar/deshabilitar usuario - requiere permiso de edición de usuarios
router.put('/:id/toggle-status', requirePermission('EDIT_USER'), UserController.toggleUserStatus);

// Actualizar permisos de usuario - requiere permiso de gestión de permisos
router.put('/:id/permissions', requirePermission('MANAGE_PERMISSIONS'), UserController.updateUserPermissions);

// Obtener todos los permisos disponibles - requiere cualquier permiso de gestión
router.get('/permissions/all', requireAnyPermission(['VIEW_USERS', 'MANAGE_PERMISSIONS']), UserController.getAllPermissions);

export default router;
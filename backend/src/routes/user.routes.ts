import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticateToken, requirePermission, requireAnyPermission } from '../middleware/auth';

const router = Router();
const userController = new UserController();

// Todas las rutas requieren autenticación obligatoria
router.use(authenticateToken);

// Obtener todos los usuarios - requiere permiso de gestión de usuarios
router.get('/', requireAnyPermission(['usuarios', 'admin_panel']), userController.getUsers);

// Obtener todos los permisos disponibles
router.get('/permissions/all', requireAnyPermission(['usuarios', 'admin_panel']), userController.getAllPermissions);

// Obtener usuario por ID - requiere permiso de lectura de usuarios
router.get('/:id', requireAnyPermission(['usuarios', 'admin_panel']), userController.getUserById);

// Crear nuevo usuario - requiere permiso de creación de usuarios
router.post('/', requireAnyPermission(['usuarios', 'admin_panel']), userController.createUser);

// Actualizar usuario - requiere permiso de edición de usuarios
router.put('/:id', requireAnyPermission(['usuarios', 'admin_panel']), userController.updateUser);

// Habilitar/deshabilitar usuario - requiere permiso de edición de usuarios
router.put('/:id/toggle-status', requireAnyPermission(['usuarios', 'admin_panel']), userController.toggleUserStatus);

// Actualizar permisos de usuario - requiere permiso de gestión de permisos
router.put('/:id/permissions', requireAnyPermission(['usuarios', 'admin_panel']), userController.updateUserPermissions);

// Eliminar usuario - requiere permiso de administración
router.delete('/:id', requireAnyPermission(['usuarios', 'admin_panel']), userController.deleteUser);

export default router;
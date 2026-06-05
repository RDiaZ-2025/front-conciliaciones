import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticateToken, requirePermission, requireAnyPermission } from '../middleware/auth';

const router = Router();
const userController = new UserController();

// Simple test route to check basic connectivity
router.get('/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Users route is working!',
    timestamp: new Date().toISOString()
  });
});

// Test route without authentication for Azure debugging
router.get('/debug/permissions', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Debug route working - no auth required',
    data: [
      { id: 1, name: 'debug_permission', description: 'Debug permission' }
    ]
  });
});

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener todos los usuarios - requiere permiso de lectura de usuarios
router.get('/', requirePermission('admin_panel'), userController.getUsers);

// Obtener todos los permisos disponibles - requiere cualquier permiso de gestión
router.get('/permissions/all', requirePermission('admin_panel'), userController.getAllPermissions);

// Test route with simpler path
router.get('/test-permissions', requirePermission('admin_panel'), userController.getAllPermissions);

// Alternative route structure for permissions
router.get('/all-permissions', requirePermission('admin_panel'), userController.getAllPermissions);

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
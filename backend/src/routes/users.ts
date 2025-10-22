import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticateToken, requirePermission, requireAnyPermission } from '../middleware/auth';

const router = Router();

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
router.get('/', requirePermission('admin_panel'), UserController.getUsers);

// Obtener todos los permisos disponibles - requiere cualquier permiso de gestión
router.get('/permissions/all', requirePermission('admin_panel'), UserController.getAllPermissions);

// Test route with simpler path
router.get('/test-permissions', requirePermission('admin_panel'), UserController.getAllPermissions);

// Alternative route structure for permissions
router.get('/all-permissions', requirePermission('admin_panel'), UserController.getAllPermissions);

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

export default router;
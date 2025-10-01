import { Router } from 'express';
import { 
  getAllMenuItems, 
  getMenuItemsByPermissions,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem
} from '../controllers/menuController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all menu routes
router.use(authenticateToken);

// GET /api/menus - Get all menu items
router.get('/', getAllMenuItems);

// POST /api/menus/by-permissions - Get menu items filtered by user permissions
router.post('/by-permissions', getMenuItemsByPermissions);

// POST /api/menus - Create a new menu item (admin only)
router.post('/', createMenuItem);

// PUT /api/menus/:id - Update a menu item (admin only)
router.put('/:id', updateMenuItem);

// DELETE /api/menus/:id - Delete a menu item (admin only)
router.delete('/:id', deleteMenuItem);

export default router;
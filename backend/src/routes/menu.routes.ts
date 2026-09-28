import { Router } from 'express';
import {
  getAllMenuItems,
  getMenuItemsByPermissions,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem
} from '../controllers/menu.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', getAllMenuItems);

router.post('/by-permissions', getMenuItemsByPermissions);

router.post('/', createMenuItem);

router.put('/:id', updateMenuItem);

router.delete('/:id', deleteMenuItem);

export default router;

import { Request, Response } from 'express';
import { MenuService } from '../services/menu.service';
import { asyncHandler } from "../utils/asyncHandler";

const menuService = new MenuService();

export const getAllMenuItems = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { project } = req.query;
  const data = await menuService.getAllMenuItems(project as string);
  res.json({ success: true, data });
});

export const getMenuItemsByPermissions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { permissions, project } = req.body;
  if (!permissions || !Array.isArray(permissions)) {
    res.status(400).json({ success: false, message: 'Permissions array is required' });
    return;
  }
  const data = await menuService.getMenuItemsByPermissions(permissions, project);
  res.json({ success: true, data });
});

export const createMenuItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { label, icon, route, parentId, displayOrder = 0, permissionId, project = 'voc' } = req.body;
  if (!label) {
    res.status(400).json({ success: false, message: 'label is required' });
    return;
  }
  const savedMenuItem = await menuService.createMenuItem({ label, icon, route, parentId, displayOrder, permissionId, project });
  res.status(201).json({
    success: true,
    data: savedMenuItem,
    message: 'Menu item created successfully'
  });
});

export const updateMenuItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { label, icon, route, parentId, displayOrder, isActive, permissionId, project } = req.body;
  const updatedItem = await menuService.updateMenuItem(parseInt(id), { label, icon, route, parentId, displayOrder, isActive, permissionId, project });
  res.json({
    success: true,
    data: updatedItem,
    message: 'Menu item updated successfully'
  });
});

export const deleteMenuItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  await menuService.deleteMenuItem(parseInt(id));
  res.json({ success: true, message: 'Menu item deleted successfully' });
});

import { Request, Response } from 'express';
import { MenuItem } from '../models';
import { AppDataSource } from '../config/typeorm.config';

export interface MenuItemResponse {
  id: number;
  label: string;
  icon?: string;
  route?: string;
  parentId?: number;
  displayOrder: number;
  isActive: boolean;
  permissionName?: string;
  permissionId?: number;
  children?: MenuItemResponse[];
}

// Helper function to build hierarchical menu structure
const buildMenuHierarchy = (menuItems: MenuItemResponse[]): MenuItemResponse[] => {
  const menuMap = new Map<number, MenuItemResponse>();
  const rootMenus: MenuItemResponse[] = [];

  // First pass: create map of all menu items
  menuItems.forEach(item => {
    menuMap.set(item.id, { ...item, children: [] });
  });

  // Second pass: build hierarchy
  menuItems.forEach(item => {
    const menuItem = menuMap.get(item.id)!;
    
    if (item.parentId === null || item.parentId === undefined) {
      // Root level item
      rootMenus.push(menuItem);
    } else {
      // Child item - add to parent's children array
      const parent = menuMap.get(item.parentId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(menuItem);
      }
    }
  });

  // Sort root menus and their children by displayOrder
  const sortByDisplayOrder = (items: MenuItemResponse[]) => {
    items.sort((a, b) => a.displayOrder - b.displayOrder);
    items.forEach(item => {
      if (item.children && item.children.length > 0) {
        sortByDisplayOrder(item.children);
      }
    });
  };

  sortByDisplayOrder(rootMenus);
  return rootMenus;
};

// Helper function to filter menus by permissions (recursive)
const filterMenusByPermissions = (menus: MenuItemResponse[], userPermissions: string[]): MenuItemResponse[] => {
  return menus.filter(menu => {
    // If menu requires a permission, check if user has it
    if (menu.permissionName && !userPermissions.includes(menu.permissionName)) {
      return false;
    }

    // If menu has children, filter them recursively
    if (menu.children && menu.children.length > 0) {
      menu.children = filterMenusByPermissions(menu.children, userPermissions);
      
      // If all children are filtered out and the menu itself has no route, hide it
      // (Unless it's a root item that might be just a container? logic depends on requirements)
      // For now, if it has no route and no visible children, we might want to hide it.
      // But let's keep it simple: just filter based on direct permission first.
    }

    return true;
  });
};

export const getAllMenuItems = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!AppDataSource.isInitialized) {
      res.status(503).json({
        success: false,
        message: 'Base de datos no disponible'
      });
      return;
    }

    const menuItemRepository = AppDataSource.getRepository(MenuItem);
    
    const menuItems = await menuItemRepository.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC' },
      relations: ['permission']
    });

    const menuItemsResponse: MenuItemResponse[] = menuItems.map(item => ({
      id: item.id,
      label: item.label,
      icon: item.icon || undefined,
      route: item.route || undefined,
      parentId: item.parentId || undefined,
      displayOrder: item.displayOrder,
      isActive: item.isActive,
      permissionName: item.permission?.name,
      permissionId: item.permissionId || undefined
    }));

    const hierarchicalMenus = buildMenuHierarchy(menuItemsResponse);
    
    res.json({
      success: true,
      data: hierarchicalMenus
    });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching menu items',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getMenuItemsByPermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { permissions } = req.body;
    
    if (!permissions || !Array.isArray(permissions)) {
      res.status(400).json({
        success: false,
        message: 'Permissions array is required'
      });
      return;
    }

    if (!AppDataSource.isInitialized) {
      res.status(503).json({
        success: false,
        message: 'Base de datos no disponible'
      });
      return;
    }

    const menuItemRepository = AppDataSource.getRepository(MenuItem);
    
    const menuItems = await menuItemRepository.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC' },
      relations: ['permission']
    });

    const menuItemsResponse: MenuItemResponse[] = menuItems.map(item => ({
      id: item.id,
      label: item.label,
      icon: item.icon || undefined,
      route: item.route || undefined,
      parentId: item.parentId || undefined,
      displayOrder: item.displayOrder,
      isActive: item.isActive,
      permissionName: item.permission?.name
    }));

    // Build hierarchy first
    const hierarchicalMenus = buildMenuHierarchy(menuItemsResponse);
    
    // Then filter by permissions
    const filteredMenus = filterMenusByPermissions(hierarchicalMenus, permissions);
    
    res.json({
      success: true,
      data: filteredMenus
    });
  } catch (error) {
    console.error('Error fetching menu items by permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching menu items by permissions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};



export const createMenuItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      label, 
      icon, 
      route, 
      parentId, 
      displayOrder = 0,
      permissionId
    } = req.body;

    if (!label) {
      res.status(400).json({
        success: false,
        message: 'label is required'
      });
      return;
    }

    if (!AppDataSource.isInitialized) {
      res.status(503).json({
        success: false,
        message: 'Base de datos no disponible'
      });
      return;
    }

    const menuItemRepository = AppDataSource.getRepository(MenuItem);
    
    // Create new menu item
    const newMenuItem = new MenuItem();
    newMenuItem.label = label;
    newMenuItem.icon = icon;
    newMenuItem.route = route;
    newMenuItem.parentId = parentId;
    newMenuItem.displayOrder = displayOrder;
    newMenuItem.isActive = true;
    newMenuItem.permissionId = permissionId || null;

    const savedMenuItem = await menuItemRepository.save(newMenuItem);

    res.status(201).json({
      success: true,
      data: {
        id: savedMenuItem.id,
        label: savedMenuItem.label,
        icon: savedMenuItem.icon,
        route: savedMenuItem.route,
        parentId: savedMenuItem.parentId,
        displayOrder: savedMenuItem.displayOrder,
        isActive: savedMenuItem.isActive,
        permissionId: savedMenuItem.permissionId
      },
      message: 'Menu item created successfully'
    });
  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating menu item',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const updateMenuItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { 
      label, 
      icon, 
      route, 
      parentId, 
      displayOrder, 
      isActive,
      permissionId
    } = req.body;

    if (!AppDataSource.isInitialized) {
      res.status(503).json({
        success: false,
        message: 'Base de datos no disponible'
      });
      return;
    }

    const menuItemRepository = AppDataSource.getRepository(MenuItem);
    
    // Check if menu item exists
    const existingItem = await menuItemRepository.findOne({
      where: { id: parseInt(id) }
    });

    if (!existingItem) {
      res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
      return;
    }

    // Update menu item
    await menuItemRepository.update(
      { id: parseInt(id) },
      {
        label: label,
        icon: icon,
        route: route,
        parentId: parentId,
        displayOrder: displayOrder,
        isActive: isActive,
        permissionId: permissionId || null
      }
    );

    // Get updated item
    const updatedItem = await menuItemRepository.findOne({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      data: {
        id: updatedItem!.id,
        label: updatedItem!.label,
        icon: updatedItem!.icon,
        route: updatedItem!.route,
        parentId: updatedItem!.parentId,
        displayOrder: updatedItem!.displayOrder,
        isActive: updatedItem!.isActive,
        permissionId: updatedItem!.permissionId
      },
      message: 'Menu item updated successfully'
    });
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating menu item',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const deleteMenuItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!AppDataSource.isInitialized) {
      res.status(503).json({
        success: false,
        message: 'Base de datos no disponible'
      });
      return;
    }

    const menuItemRepository = AppDataSource.getRepository(MenuItem);
    
    // Check if menu item has children
    const childCount = await menuItemRepository.count({
      where: { parentId: parseInt(id), isActive: true }
    });

    if (childCount > 0) {
      res.status(400).json({
        success: false,
        message: 'Cannot delete menu item that has active children. Please delete or reassign children first.'
      });
      return;
    }

    // Soft delete (set isActive to false)
    const updateResult = await menuItemRepository.update(
      { id: parseInt(id) },
      { isActive: false }
    );

    if (updateResult.affected === 0) {
      res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Menu item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting menu item',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
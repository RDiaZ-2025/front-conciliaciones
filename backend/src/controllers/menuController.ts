import { Request, Response } from 'express';
import { getPool, sql } from '../config/database';

export interface MenuItem {
  id: number;
  label: string;
  icon?: string;
  route?: string;
  parentId?: number;
  displayOrder: number;
  isActive: boolean;
  children?: MenuItem[];
}

// Helper function to build hierarchical menu structure
const buildMenuHierarchy = (menuItems: MenuItem[]): MenuItem[] => {
  const menuMap = new Map<number, MenuItem>();
  const rootMenus: MenuItem[] = [];

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
  const sortByDisplayOrder = (items: MenuItem[]) => {
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
// Note: Since permissions are removed from the database, this function now returns all menus
const filterMenusByPermissions = (menus: MenuItem[], userPermissions: string[]): MenuItem[] => {
  return menus.filter(menu => {
    // Since permissionRequired is removed, all menus are accessible
    // If menu has children, filter them recursively
    if (menu.children && menu.children.length > 0) {
      menu.children = filterMenusByPermissions(menu.children, userPermissions);
    }

    return true;
  });
};

export const getAllMenuItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const pool = getPool();
    
    if (!pool) {
      res.status(503).json({
        success: false,
        message: 'Base de datos no disponible'
      });
      return;
    }

    const request = pool.request();
    const result = await request.query(`
      SELECT 
        id,
        label,
        icon,
        route,
        parentId,
        displayOrder,
        isActive
      FROM MENU_ITEMS 
      WHERE isActive = 1
      ORDER BY displayOrder ASC
    `);

    const hierarchicalMenus = buildMenuHierarchy(result.recordset);
    
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

    const pool = getPool();
    
    if (!pool) {
      res.status(503).json({
        success: false,
        message: 'Base de datos no disponible'
      });
      return;
    }

    const request = pool.request();
    const result = await request.query(`
      SELECT 
        id,
        label,
        icon,
        route,
        parentId,
        displayOrder,
        isActive
      FROM MENU_ITEMS 
      WHERE isActive = 1
      ORDER BY displayOrder ASC
    `);

    // Build hierarchy first
    const hierarchicalMenus = buildMenuHierarchy(result.recordset);
    
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
      displayOrder = 0 
    } = req.body;

    if (!label) {
      res.status(400).json({
        success: false,
        message: 'label is required'
      });
      return;
    }

    const pool = getPool();
    
    if (!pool) {
      res.status(503).json({
        success: false,
        message: 'Base de datos no disponible'
      });
      return;
    }

    const request = pool.request();
    
    // Insert new menu item
    const result = await request
      .input('label', sql.NVarChar, label)
      .input('icon', sql.NVarChar, icon)
      .input('route', sql.NVarChar, route)
      .input('parentId', sql.Int, parentId)
      .input('displayOrder', sql.Int, displayOrder)
      .query(`
        INSERT INTO MENU_ITEMS (label, icon, route, parentId, displayOrder)
        OUTPUT INSERTED.*
        VALUES (@label, @icon, @route, @parentId, @displayOrder)
      `);

    res.status(201).json({
      success: true,
      data: result.recordset[0],
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
      isActive 
    } = req.body;

    const pool = getPool();
    
    if (!pool) {
      res.status(503).json({
        success: false,
        message: 'Base de datos no disponible'
      });
      return;
    }

    const request = pool.request();
    
    // Check if menu item exists
    const existingItem = await request
      .input('id', sql.Int, parseInt(id))
      .query('SELECT id FROM MENU_ITEMS WHERE id = @id');

    if (existingItem.recordset.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
      return;
    }

    // Create a new request for the update operation
    const updateRequest = pool.request();
    
    // Update menu item
    const result = await updateRequest
      .input('id', sql.Int, parseInt(id))
      .input('label', sql.NVarChar, label)
      .input('icon', sql.NVarChar, icon)
      .input('route', sql.NVarChar, route)
      .input('parentId', sql.Int, parentId)
      .input('displayOrder', sql.Int, displayOrder)
      .input('isActive', sql.Bit, isActive)
      .query(`
        UPDATE MENU_ITEMS 
        SET 
          label = @label,
          icon = @icon,
          route = @route,
          parentId = @parentId,
          displayOrder = @displayOrder,
          isActive = @isActive
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    res.json({
      success: true,
      data: result.recordset[0],
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

    const pool = getPool();
    
    if (!pool) {
      res.status(503).json({
        success: false,
        message: 'Base de datos no disponible'
      });
      return;
    }

    const request = pool.request();
    
    // Check if menu item has children
    const childrenCheck = await request
      .input('parentId', sql.Int, parseInt(id))
      .query('SELECT COUNT(*) as childCount FROM MENU_ITEMS WHERE parentId = @parentId AND isActive = 1');

    if (childrenCheck.recordset[0].childCount > 0) {
      res.status(400).json({
        success: false,
        message: 'Cannot delete menu item that has active children. Please delete or reassign children first.'
      });
      return;
    }

    // Create a new request for the delete operation
    const deleteRequest = pool.request();

    // Soft delete (set isActive to false)
    const result = await deleteRequest
      .input('id', sql.Int, parseInt(id))
      .query(`
        UPDATE MENU_ITEMS 
        SET isActive = 0
        OUTPUT DELETED.*
        WHERE id = @id
      `);

    if (result.recordset.length === 0) {
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
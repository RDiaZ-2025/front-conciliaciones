import { apiRequest } from './baseApiService';

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

export interface MenuApiResponse {
  success: boolean;
  data: MenuItem[];
  message?: string;
}

class MenuService {
  private baseUrl = '/menus';

  // Get all menu items in hierarchical structure
  async getAllMenuItems(): Promise<MenuItem[]> {
    try {
      const response = await apiRequest(this.baseUrl);
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.message || 'Error fetching menu items');
      }
    } catch (error) {
      console.error('Error fetching menu items:', error);
      throw error;
    }
  }

  // Get menu items filtered by user permissions in hierarchical structure
  async getMenuItemsByPermissions(permissions: string[]): Promise<MenuItem[]> {
    try {
      const response = await apiRequest(`${this.baseUrl}/by-permissions`, {
        method: 'POST',
        body: JSON.stringify({ permissions })
      });
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.message || 'Error fetching menu items by permissions');
      }
    } catch (error) {
      console.error('Error fetching menu items by permissions:', error);
      throw error;
    }
  }

  // Create a new menu item
  async createMenuItem(menuItem: Partial<MenuItem>): Promise<{ id: number }> {
    try {
      const response = await apiRequest(this.baseUrl, {
        method: 'POST',
        body: JSON.stringify(menuItem)
      });
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.message || 'Error creating menu item');
      }
    } catch (error) {
      console.error('Error creating menu item:', error);
      throw error;
    }
  }

  // Update a menu item
  async updateMenuItem(id: number, menuItem: Partial<MenuItem>): Promise<void> {
    try {
      const response = await apiRequest(`${this.baseUrl}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(menuItem)
      });
      
      if (!response.success) {
        throw new Error(response.message || 'Error updating menu item');
      }
    } catch (error) {
      console.error('Error updating menu item:', error);
      throw error;
    }
  }

  // Delete a menu item (soft delete)
  async deleteMenuItem(id: number): Promise<void> {
    try {
      const response = await apiRequest(`${this.baseUrl}/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.success) {
        throw new Error(response.message || 'Error deleting menu item');
      }
    } catch (error) {
      console.error('Error deleting menu item:', error);
      throw error;
    }
  }

  // Helper function to flatten hierarchical menu structure
  flattenMenuItems(menuItems: MenuItem[]): (MenuItem & { level: number; hasChildren: boolean })[] {
    const flattened: (MenuItem & { level: number; hasChildren: boolean })[] = [];
    
    const flatten = (items: MenuItem[], level = 0) => {
      items.forEach(item => {
        flattened.push({
          ...item,
          level,
          hasChildren: !!(item.children && item.children.length > 0)
        });
        
        if (item.children && item.children.length > 0) {
          flatten(item.children, level + 1);
        }
      });
    };
    
    flatten(menuItems);
    return flattened;
  }

  // Helper function to find a menu item by ID in hierarchical structure
  findMenuItemById(menuItems: MenuItem[], targetId: number): MenuItem | null {
    for (const item of menuItems) {
      if (item.id === targetId) {
        return item;
      }
      
      if (item.children && item.children.length > 0) {
        const found = this.findMenuItemById(item.children, targetId);
        if (found) {
          return found;
        }
      }
    }
    
    return null;
  }

  // Helper function to get all parent menu items for a given menu item
  getMenuItemParents(menuItems: MenuItem[], targetId: number): MenuItem[] {
    const parents: MenuItem[] = [];
    
    const findParents = (items: MenuItem[], target: number, currentPath: MenuItem[] = []): boolean => {
      for (const item of items) {
        const newPath = [...currentPath, item];
        
        if (item.id === target) {
          parents.push(...currentPath);
          return true;
        }
        
        if (item.children && item.children.length > 0) {
          if (findParents(item.children, target, newPath)) {
            return true;
          }
        }
      }
      
      return false;
    };
    
    findParents(menuItems, targetId);
    return parents;
  }
}

export const menuService = new MenuService();
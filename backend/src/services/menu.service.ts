import { AppDataSource } from '../config/typeorm.config';
import { MenuItem } from '../models';

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
  project: string;
  children?: MenuItemResponse[];
}

export class MenuService {
  private buildMenuHierarchy(menuItems: MenuItemResponse[]): MenuItemResponse[] {
    const menuMap = new Map<number, MenuItemResponse>();
    const rootMenus: MenuItemResponse[] = [];

    menuItems.forEach(item => {
      menuMap.set(item.id, { ...item, children: [] });
    });

    menuItems.forEach(item => {
      const menuItem = menuMap.get(item.id)!;

      if (item.parentId === null || item.parentId === undefined) {
        rootMenus.push(menuItem);
      } else {
        const parent = menuMap.get(item.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(menuItem);
        }
      }
    });

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
  }

  private filterMenusByPermissions(menus: MenuItemResponse[], userPermissions: string[]): MenuItemResponse[] {
    return menus.filter(menu => {
      if (menu.permissionName && !userPermissions.includes(menu.permissionName)) {
        return false;
      }

      if (menu.children && menu.children.length > 0) {
        menu.children = this.filterMenusByPermissions(menu.children, userPermissions);
      }

      return true;
    });
  }

  async getAllMenuItems(project?: string): Promise<MenuItemResponse[]> {
    if (!AppDataSource.isInitialized) {
      throw new Error('Base de datos no disponible');
    }

    const menuItemRepository = AppDataSource.getRepository(MenuItem);

    const whereClause: any = { isActive: true };
    if (project) {
      whereClause.project = project;
    }

    const menuItems = await menuItemRepository.find({
      where: whereClause,
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
      permissionId: item.permissionId || undefined,
      project: item.project
    }));

    return this.buildMenuHierarchy(menuItemsResponse);
  }

  async getMenuItemsByPermissions(permissions: string[], project?: string): Promise<MenuItemResponse[]> {
    if (!AppDataSource.isInitialized) {
      throw new Error('Base de datos no disponible');
    }

    const menuItemRepository = AppDataSource.getRepository(MenuItem);

    const whereClause: any = { isActive: true };
    if (project) {
      whereClause.project = project;
    }

    const menuItems = await menuItemRepository.find({
      where: whereClause,
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
      permissionId: item.permissionId || undefined,
      project: item.project
    }));

    const hierarchicalMenus = this.buildMenuHierarchy(menuItemsResponse);

    return this.filterMenusByPermissions(hierarchicalMenus, permissions);
  }

  async createMenuItem(data: Partial<MenuItem>): Promise<MenuItem> {
    if (!AppDataSource.isInitialized) {
      throw new Error('Base de datos no disponible');
    }

    const menuItemRepository = AppDataSource.getRepository(MenuItem);

    const newMenuItem = new MenuItem();
    newMenuItem.label = data.label!;
    newMenuItem.icon = data.icon || null;
    newMenuItem.route = data.route || null;
    newMenuItem.parentId = data.parentId || null;
    newMenuItem.displayOrder = data.displayOrder || 0;
    newMenuItem.isActive = true;
    newMenuItem.permissionId = data.permissionId || null;
    newMenuItem.project = data.project || 'voc';

    return await menuItemRepository.save(newMenuItem);
  }

  async updateMenuItem(id: number, data: Partial<MenuItem>): Promise<MenuItem> {
    if (!AppDataSource.isInitialized) {
      throw new Error('Base de datos no disponible');
    }

    const menuItemRepository = AppDataSource.getRepository(MenuItem);

    const existingItem = await menuItemRepository.findOne({
      where: { id }
    });

    if (!existingItem) {
      throw new Error('Menu item not found');
    }

    await menuItemRepository.update(
      { id },
      {
        label: data.label,
        icon: data.icon,
        route: data.route,
        parentId: data.parentId,
        displayOrder: data.displayOrder,
        isActive: data.isActive,
        permissionId: data.permissionId || null,
        project: data.project
      }
    );

    const updatedItem = await menuItemRepository.findOne({
      where: { id }
    });

    return updatedItem!;
  }

  async deleteMenuItem(id: number): Promise<void> {
    if (!AppDataSource.isInitialized) {
      throw new Error('Base de datos no disponible');
    }

    const menuItemRepository = AppDataSource.getRepository(MenuItem);

    const childCount = await menuItemRepository.count({
      where: { parentId: id, isActive: true }
    });

    if (childCount > 0) {
      throw new Error('Cannot delete menu item that has active children. Please delete or reassign children first.');
    }

    const updateResult = await menuItemRepository.update(
      { id },
      { isActive: false }
    );

    if (updateResult.affected === 0) {
      throw new Error('Menu item not found');
    }
  }
}

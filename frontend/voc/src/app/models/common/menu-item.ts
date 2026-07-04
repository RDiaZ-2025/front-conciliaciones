export interface MenuItem {
    id: number;
    label: string;
    icon?: string;
    route?: string;
    parentId?: number;
    displayOrder: number;
    isActive: boolean;
    project: string;
    children?: MenuItem[];
    permissionId?: number;
}
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

export interface MenuFormData {
    label: string;
    icon: string;
    route: string;
    parentId: number | null;
    displayOrder: number;
    isActive: boolean;
}

export interface MenuManagementState {
    menuItems: MenuItem[];
    loading: boolean;
    error: string | null;
    isDialogOpen: boolean;
    editingItem: MenuItem | null;
    formData: MenuFormData;
}

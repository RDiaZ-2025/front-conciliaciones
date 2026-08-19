export interface MenuFormData {
    label: string;
    icon: string;
    route: string;
    parentId: number | null;
    displayOrder: number;
    isActive: boolean;
    permissionId: number | null;
    project: string;
}
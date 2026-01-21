export interface Permission {
    id: number;
    name: string;
    description: string | null;
    createdAt?: Date;
}

export interface PermissionFormData {
    name: string;
    description: string | null;
}

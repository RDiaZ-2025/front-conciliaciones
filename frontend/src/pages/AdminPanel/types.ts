export interface User {
  id: string | number;
  name: string;
  email: string;
  permissions?: string[];
  role?: string;
  status: number;
  lastAccess?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Permission {
  id?: string | number;
  name?: string;
  Name?: string;
  description?: string;
  Description?: string;
}

export interface FormData {
  name: string;
  email: string;
  password: string;
  permissions: string[];
}

export interface AccessHistoryRecord {
  email: string;
  loginTime: string;
  timestamp?: string;
  source: 'backend' | 'frontend';
}

export interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
}

export interface AdminPanelProps {
  darkMode: boolean;
  setDarkMode: (darkMode: boolean) => void;
  onBack: () => void;
  onGoToUpload: () => void;
  onGoToDashboard: () => void;
}

export interface UseAdminPanelReturn {
  users: User[];
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  selectedMenu: string;
  setSelectedMenu: (menu: string) => void;
  openDialog: boolean;
  setOpenDialog: (open: boolean) => void;
  editingUser: User | null;
  setEditingUser: (user: User | null) => void;
  formData: FormData;
  setFormData: (data: FormData) => void;
  availablePermissions: Permission[];
  accessHistory: AccessHistoryRecord[];
  showAccessHistory: boolean;
  setShowAccessHistory: (show: boolean) => void;
  snackbar: SnackbarState;
  setSnackbar: (snackbar: SnackbarState) => void;
  openRoleDialog: boolean;
  setOpenRoleDialog: (open: boolean) => void;
  selectedUserForRole: User | null;
  setSelectedUserForRole: (user: User | null) => void;
  searchUser: string;
  setSearchUser: (search: string) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  usersPerPage: number;
  refreshUsers: () => Promise<void>;
  loadAvailablePermissions: () => Promise<void>;
  loadAccessHistory: () => void;
  formatLoginTime: (loginTime: string) => string;
  handleToggleAccessHistory: () => void;
  handleOpenDialog: (userToEdit?: User | null) => void;
  handleCloseDialog: () => void;
  handleOpenRoleDialog: (userData: User) => void;
  handleCloseRoleDialog: () => void;
  handleRoleChange: (newRole: string) => Promise<void>;
  handleDirectRoleChange: (userData: User, newRole: string) => Promise<void>;
  getRoleDescription: (role: string) => string;
  handleSubmit: () => Promise<void>;
  handleToggleStatus: (userEmail: string, currentStatus: number) => Promise<void>;
  getRoleLabel: (role: string) => string;
  getRoleColor: (role: string) => string;
  getPermissionLabel: (permission: string) => string;
  getPermissionDescription: (permission: string) => string;
  getPermissionColor: (permission: string) => string;
  handlePermissionChange: (userData: User, newPermissions: string[]) => Promise<void>;
  handleTogglePermission: (permission: string | Permission) => void;
}
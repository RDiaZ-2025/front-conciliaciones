export interface User {
  id: string | number;
  name: string;
  email: string;
  permissions?: string[];
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
  handleSubmit: () => Promise<void>;
  handleToggleStatus: (userEmail: string, currentStatus: number) => Promise<void>;
  getPermissionLabel: (permission: string) => string;
  getPermissionDescription: (permission: string) => string;
  getPermissionColor: (permission: string) => string;
  handlePermissionChange: (userData: User, newPermissions: string[]) => Promise<void>;
}
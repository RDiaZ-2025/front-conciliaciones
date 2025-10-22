import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ROLES, PERMISSIONS, PERMISSION_LABELS, PERMISSION_DESCRIPTIONS, PERMISSION_COLORS } from '../../constants/auth';
import { apiRequest } from '../../services/baseApiService';
import type { User, Permission, FormData, AccessHistoryRecord, SnackbarState, UseAdminPanelReturn } from './types';

export const useAdminPanel = (): UseAdminPanelReturn => {
  const { getAllUsers, createUser, updateUser, toggleUserStatus, user, hasPermission } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    permissions: []
  });
  const [availablePermissions, setAvailablePermissions] = useState<Permission[]>([]);
  const [accessHistory, setAccessHistory] = useState<AccessHistoryRecord[]>([]);
  const [showAccessHistory, setShowAccessHistory] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '', severity: 'success' });
  const [openRoleDialog, setOpenRoleDialog] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState<User | null>(null);
  const [searchUser, setSearchUser] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 5;

  const refreshUsers = async () => {
    try {
      const usersList = await getAllUsers();
      setUsers(usersList);
    } catch (error: any) {
      if (error.message && (error.message.includes('Token de acceso requerido') || error.message.includes('Token inválido') || error.message.includes('403') || error.message.includes('401'))) {
        setSnackbar({ open: true, message: 'Sesión expirada o sin permisos. Por favor, inicia sesión nuevamente.', severity: 'error' });
        setTimeout(() => { window.location.href = '/login'; }, 2000);
      } else {
        setSnackbar({ open: true, message: 'Error al cargar usuarios', severity: 'error' });
      }
      console.error('Error al obtener usuarios:', error);
    }
  };

  const loadAvailablePermissions = async () => {
    try {
      const result = await apiRequest('/users/permissions/all');
      setAvailablePermissions(result.data || []);
    } catch (error) {
      console.error('Error al cargar permisos:', error);
    }
  };

  const loadAccessHistory = () => {
    try {
      const backendHistory = JSON.parse(localStorage.getItem('user_access_history') || '{}');
      const frontendHistory = JSON.parse(localStorage.getItem('frontend_login_history') || '[]');
      
      const combinedHistory: AccessHistoryRecord[] = [];
      
      Object.keys(backendHistory).forEach(email => {
        backendHistory[email].forEach((record: any) => {
          combinedHistory.push({
            ...record,
            source: 'backend' as const
          });
        });
      });
      
      frontendHistory.forEach((record: any) => {
        combinedHistory.push({
          ...record,
          source: 'frontend' as const
        });
      });
      
      combinedHistory.sort((a, b) => new Date(b.loginTime).getTime() - new Date(a.loginTime).getTime());
      
      setAccessHistory(combinedHistory);
      
      console.log('✅ Historial de accesos cargado:', combinedHistory.length, 'registros');
    } catch (error) {
      console.error('Error cargando historial de accesos:', error);
      setSnackbar({ open: true, message: 'Error al cargar historial de accesos', severity: 'error' });
    }
  };

  const formatLoginTime = (loginTime: string): string => {
    try {
      const date = new Date(loginTime);
      return date.toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  const handleToggleAccessHistory = () => {
    if (!showAccessHistory) {
      loadAccessHistory();
    }
    setShowAccessHistory(!showAccessHistory);
  };

  useEffect(() => {
    refreshUsers();
    loadAvailablePermissions();
  }, []);

  const handleOpenDialog = (userToEdit: User | null = null) => {
    if (userToEdit) {
      setEditingUser(userToEdit);
      setFormData({
        name: userToEdit.name,
        email: userToEdit.email,
        password: '',
        permissions: userToEdit.permissions ? userToEdit.permissions.map(p => typeof p === 'string' ? p : (p as any).Name || (p as any).name || p) : []
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        permissions: []
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', permissions: [] });
  };

  const handleOpenRoleDialog = (userData: User) => {
    setSelectedUserForRole(userData);
    setOpenRoleDialog(true);
  };

  const handleCloseRoleDialog = () => {
    setOpenRoleDialog(false);
    setSelectedUserForRole(null);
  };

  const handleRoleChange = async (newRole: string) => {
    if (!selectedUserForRole) return;
    
    try {
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.email === selectedUserForRole.email 
            ? { ...user, role: newRole }
            : user
        )
      );
      
      setSelectedUserForRole(prev => prev ? { ...prev, role: newRole } : null);
      
      await updateUser(selectedUserForRole.id, { role: newRole });
      setSnackbar({ open: true, message: 'Rol actualizado exitosamente', severity: 'success' });
      
      handleCloseRoleDialog();
      
      await refreshUsers();
    } catch (error: any) {
      await refreshUsers();
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  };

  const handleDirectRoleChange = async (userData: User, newRole: string) => {
    try {
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.email === userData.email 
            ? { ...user, role: newRole }
            : user
        )
      );
      
      await updateUser(userData.id, { role: newRole });
      setSnackbar({ open: true, message: `Rol actualizado a ${getRoleLabel(newRole)} exitosamente`, severity: 'success' });
      
      await refreshUsers();
    } catch (error: any) {
      await refreshUsers();
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  };

  const getRoleDescription = (role: string): string => {
    switch (role) {
      case ROLES.UPLOAD_ONLY:
        return 'Puede cargar archivos únicamente';
      case ROLES.DASHBOARD_ONLY:
        return 'Puede ver el dashboard únicamente';
      case ROLES.FULL_ACCESS:
        return 'Puede cargar archivos y ver dashboard';
      case ROLES.ADMIN:
        return 'Acceso completo y gestión de usuarios';
      default:
        return 'Rol no definido';
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingUser) {
        if (!editingUser.email) {
          setSnackbar({ open: true, message: 'Error: El usuario no tiene email válido', severity: 'error' });
          return;
        }
        console.log('Updating user:', editingUser.email, 'with data:', formData);
        const updates: any = {
          name: formData.name,
          email: formData.email,
          permissions: formData.permissions.map(p => typeof p === 'string' ? p.toUpperCase() : ((p as any).Name || (p as any).name || String(p)).toUpperCase())
        };
        if (formData.password) {
          updates.password = formData.password;
        }
        console.log('Calling updateUser with email:', editingUser.email, 'and updates:', updates);
        await updateUser(editingUser.email, updates);
        console.log('Update successful for user:', editingUser.email);
        setSnackbar({ open: true, message: 'Usuario actualizado exitosamente', severity: 'success' });
      } else {
        if (!formData.name || !formData.email || !formData.password) {
          setSnackbar({ open: true, message: 'Todos los campos son obligatorios', severity: 'error' });
          return;
        }
        const newUserData = {
          ...formData,
          permissions: formData.permissions.map(p => typeof p === 'string' ? p.toUpperCase() : ((p as any).Name || (p as any).name || String(p)).toUpperCase())
        };
        await createUser(newUserData);
        setSnackbar({ open: true, message: 'Usuario creado exitosamente', severity: 'success' });
      }
      await refreshUsers();
      handleCloseDialog();
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  };

  const handleToggleStatus = async (userEmail: string, currentStatus: number) => {
    const action = currentStatus === 1 ? 'deshabilitar' : 'habilitar';
    const confirmMessage = `¿Estás seguro de que quieres ${action} este usuario?`;

    if (window.confirm(confirmMessage)) {
      try {
        const result = await toggleUserStatus(userEmail);
        setUsers(prevUsers =>
          prevUsers.map(user =>
            user.email === userEmail
              ? { ...user, status: result.newStatus }
              : user
          )
        );
        await refreshUsers();
        const statusMessage = result.newStatus === 1 ? 'habilitado' : 'deshabilitado';
        setSnackbar({ 
          open: true, 
          message: `Usuario ${statusMessage} exitosamente`, 
          severity: 'success' 
        });
      } catch (error: any) {
        await refreshUsers();
        setSnackbar({ open: true, message: error.message, severity: 'error' });
      }
    }
  };

  const getRoleLabel = (role: string): string => {
    if (!role || role === null || role === '') {
      return 'Sin rol';
    }
    const labels: Record<string, string> = {
      [ROLES.ADMIN]: 'Administrador',
      [ROLES.UPLOAD_ONLY]: 'Solo Carga',
      [ROLES.DASHBOARD_ONLY]: 'Solo Dashboard',
      [ROLES.FULL_ACCESS]: 'Acceso Completo'
    };
    return labels[role] || role;
  };

  const getRoleColor = (role: string): string => {
    if (!role || role === null || role === '') {
      return 'warning';
    }
    const colors: Record<string, string> = {
      [ROLES.ADMIN]: 'error',
      [ROLES.UPLOAD_ONLY]: 'primary',
      [ROLES.DASHBOARD_ONLY]: 'secondary',
      [ROLES.FULL_ACCESS]: 'success'
    };
    return colors[role] || 'default';
  };

  const getPermissionLabel = (permission: string): string => {
    return PERMISSION_LABELS[permission] || permission;
  };

  const getPermissionDescription = (permission: string): string => {
    return PERMISSION_DESCRIPTIONS[permission] || 'Permiso personalizado';
  };

  const getPermissionColor = (permission: string): string => {
    return PERMISSION_COLORS[permission] || 'default';
  };

  const handlePermissionChange = async (userData: User, newPermissions: string[]) => {
    try {
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.email === userData.email 
            ? { ...user, permissions: newPermissions }
            : user
        )
      );
      
      const response = await fetch(`/api/users/${userData.id}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ permissions: newPermissions })
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setSnackbar({ open: true, message: 'Sesión expirada o sin permisos. Por favor, inicia sesión nuevamente.', severity: 'error' });
          setTimeout(() => { window.location.href = '/login'; }, 2000);
        } else {
          throw new Error('Error al actualizar permisos');
        }
      }
      
      setSnackbar({ open: true, message: 'Permisos actualizados exitosamente', severity: 'success' });
      await refreshUsers();
    } catch (error: any) {
      await refreshUsers();
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  };

  const handleTogglePermission = (permission: string | Permission) => {
    if (!selectedUserForRole) { return; }
    
    const currentPermissions = selectedUserForRole.permissions || [];
    const permissionName = typeof permission === 'string' ? permission : ((permission as any).Name || (permission as any).name || String(permission));
    
    let newPermissions: string[];
    if (currentPermissions.includes(permissionName)) {
      newPermissions = currentPermissions.filter(p => p !== permissionName);
    } else {
      newPermissions = [...currentPermissions, permissionName];
    }
    const uniquePermissions = Array.from(new Set(newPermissions.map(p => typeof p === 'string' ? p : ((p as any).Name || (p as any).name || String(p)))));
    
    setSelectedUserForRole(prev => ({
      ...prev!,
      permissions: uniquePermissions
    }));
    handlePermissionChange(selectedUserForRole, uniquePermissions);
  };

  return {
    users,
    openDialog,
    setOpenDialog,
    editingUser,
    setEditingUser,
    formData,
    setFormData,
    availablePermissions,
    accessHistory,
    showAccessHistory,
    setShowAccessHistory,
    snackbar,
    setSnackbar,
    openRoleDialog,
    setOpenRoleDialog,
    selectedUserForRole,
    setSelectedUserForRole,
    searchUser,
    setSearchUser,
    currentPage,
    setCurrentPage,
    usersPerPage,
    refreshUsers,
    loadAvailablePermissions,
    loadAccessHistory,
    formatLoginTime,
    handleToggleAccessHistory,
    handleOpenDialog,
    handleCloseDialog,
    handleOpenRoleDialog,
    handleCloseRoleDialog,
    handleRoleChange,
    handleDirectRoleChange,
    getRoleDescription,
    handleSubmit,
    handleToggleStatus,
    getRoleLabel,
    getRoleColor,
    getPermissionLabel,
    getPermissionDescription,
    getPermissionColor,
    handlePermissionChange,
    handleTogglePermission
  };
};
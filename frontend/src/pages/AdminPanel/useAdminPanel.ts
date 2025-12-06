import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { PERMISSIONS, PERMISSION_LABELS, PERMISSION_DESCRIPTIONS, PERMISSION_COLORS } from '../../constants/auth';
import { apiRequest } from '../../services/baseApiService';
import { userService } from '../../services/userService';
import type { User, Permission, FormData, AccessHistoryRecord, SnackbarState, UseAdminPanelReturn } from './types';

export const useAdminPanel = (): UseAdminPanelReturn => {
  const { getAllUsers, createUser, updateUser, toggleUserStatus, user, hasPermission, availablePermissions } = useAuth();
  const [users, setUsers] = useState<User[]>([]);

  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    permissions: []
  });
  const [accessHistory, setAccessHistory] = useState<AccessHistoryRecord[]>([]);
  const [showAccessHistory, setShowAccessHistory] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '', severity: 'success' });
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
    // Now handled by AuthContext, but keeping function to satisfy interface if needed
    // or we can remove it if the component doesn't call it explicitly.
    // If the component calls it, it might be redundant.
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

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        permissions: user.permissions?.map(p => p) || []
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

  const handleSubmit = async () => {
    try {
      if (editingUser) {
        if (!editingUser.email) {
          setSnackbar({ open: true, message: 'Error: El usuario no tiene email válido', severity: 'error' });
          return;
        }

        const updates: any = {
          name: formData.name,
          email: formData.email,
          permissions: formData.permissions.map(p => typeof p === 'string' ? p.toUpperCase() : ((p as any).Name || (p as any).name || String(p)).toUpperCase())
        };
        if (formData.password) {
          updates.password = formData.password;
        }

        await updateUser(editingUser.email, updates);

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
    // Prevent users from disabling their own account regardless of permissions
    try {
      const currentUserEmail = (user?.email || '').toLowerCase();
      const targetEmail = (userEmail || '').toLowerCase();
      if (currentUserEmail && targetEmail === currentUserEmail) {
        setSnackbar({
          open: true,
          message: 'No puedes deshabilitar tu propia cuenta',
          severity: 'error'
        });
        return;
      }
    } catch (e) {
      // If anything goes wrong in the guard, fail closed
      setSnackbar({
        open: true,
        message: 'Acción no permitida sobre tu propia cuenta',
        severity: 'error'
      });
      return;
    }

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

  const getPermissionLabel = (permission: string): string => {
    const found = availablePermissions.find(p => p.name === permission);
    // Use description if available, or label if we had one, or name
    return found?.description || found?.name || PERMISSION_LABELS[permission] || permission;
  };

  const getPermissionDescription = (permission: string): string => {
    const found = availablePermissions.find(p => p.name === permission);
    return found?.description || PERMISSION_DESCRIPTIONS[permission] || 'Permiso personalizado';
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
    handleSubmit,
    handleToggleStatus,
    getPermissionLabel,
    getPermissionDescription,
    getPermissionColor,
    handlePermissionChange
  };
};
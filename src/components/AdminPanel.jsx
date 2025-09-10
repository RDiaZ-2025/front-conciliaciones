import React, { useState, useEffect } from 'react';
import logoClaroMedia from '../assets/Claro-Media-Logo.jpg';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Snackbar
} from '@mui/material';
import { styled } from '@mui/material/styles';

const CustomChip = styled(Chip)(({ color }) => {
  if (color === 'customAdmin') {
    return { backgroundColor: '#b71c1c', color: '#fff' };
  }
  if (color === 'customUpload') {
    return { backgroundColor: '#388e3c', color: '#fff' };
  }
  if (color === 'customDashboard') {
    return { backgroundColor: darkMode ? '#444' : '#1565c0', color: '#fff' };
  }
  return {};
});

import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AdminPanelSettings as AdminIcon,
  Upload as UploadIcon,
  Dashboard as DashboardIcon,
  Person as PersonIcon,
  Security as SecurityIcon,
  History as HistoryIcon,
  AccessTime as AccessTimeIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  Menu as MenuIcon
} from '@mui/icons-material';
import Drawer from '@mui/material/Drawer';
import { useAuth } from '../contexts/AuthContext';
import { ROLES, PERMISSIONS, PERMISSION_LABELS, PERMISSION_DESCRIPTIONS, PERMISSION_COLORS } from '../constants/auth';
import DarkModeToggle from './DarkModeToggle';
import LoadDocumentsOCbyUserView from './LoadDocumentsOCbyUserView';
import DashboardGeneral from './DashboardGeneral';
import UploadForm from './UploadForm';

const AdminPanel = ({ darkMode, setDarkMode, onBack, onGoToUpload, onGoToDashboard }) => {
  const { getAllUsers, createUser, updateUser, deleteUser, toggleUserStatus, user, hasPermission } = useAuth();
  const [users, setUsers] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState('');
  
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    permissions: [] // Cambiar a permisos individuales
  });
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [accessHistory, setAccessHistory] = useState([]);
  const [showAccessHistory, setShowAccessHistory] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [openRoleDialog, setOpenRoleDialog] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState(null);
const [searchUser, setSearchUser] = useState("");
const [currentPage, setCurrentPage] = useState(1);
const usersPerPage = 5;

  const refreshUsers = async () => {
    try {
      const usersList = await getAllUsers();
      setUsers(usersList);
    } catch (error) {
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
      const response = await fetch('/api/users/permissions/all', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      if (response.ok) {
        const result = await response.json();
        setAvailablePermissions(result.data || []);
      } else {
        console.error('Error al cargar permisos disponibles');
      }
    } catch (error) {
      console.error('Error al cargar permisos:', error);
    }
  };

  const loadAccessHistory = () => {
    try {
      // Cargar historial del backend (mock users)
      const backendHistory = JSON.parse(localStorage.getItem('user_access_history') || '{}');
      
      // Cargar historial del frontend
      const frontendHistory = JSON.parse(localStorage.getItem('frontend_login_history') || '[]');
      
      // Combinar ambos historiales
      const combinedHistory = [];
      
      // Agregar historial del backend
      Object.keys(backendHistory).forEach(email => {
        backendHistory[email].forEach(record => {
          combinedHistory.push({
            ...record,
            source: 'backend'
          });
        });
      });
      
      // Agregar historial del frontend
      frontendHistory.forEach(record => {
        combinedHistory.push({
          ...record,
          source: 'frontend'
        });
      });
      
      // Ordenar por timestamp descendente (más reciente primero)
      combinedHistory.sort((a, b) => new Date(b.loginTime) - new Date(a.loginTime));
      
      setAccessHistory(combinedHistory);
      
      console.log('✅ Historial de accesos cargado:', combinedHistory.length, 'registros');
    } catch (error) {
      console.error('Error cargando historial de accesos:', error);
      setSnackbar({ open: true, message: 'Error al cargar historial de accesos', severity: 'error' });
    }
  };

  const formatLoginTime = (loginTime) => {
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

  // Actualizar la lista de usuarios y permisos cuando el componente se monta
  useEffect(() => {
    refreshUsers();
    loadAvailablePermissions();
  }, [getAllUsers]);

  const handleOpenDialog = (userToEdit = null) => {
    if (userToEdit) {
      setEditingUser(userToEdit);
      setFormData({
        name: userToEdit.name,
        email: userToEdit.email,
        password: '',
        permissions: userToEdit.permissions ? userToEdit.permissions.map(p => typeof p === 'string' ? p : p.Name || p.name || p) : []
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

  const handleOpenRoleDialog = (userData) => {
    setSelectedUserForRole(userData);
    setOpenRoleDialog(true);
  };

  const handleCloseRoleDialog = () => {
    setOpenRoleDialog(false);
    setSelectedUserForRole(null);
  };

  const handleRoleChange = async (newRole) => {
    try {
      // Actualización optimista del estado local para cambio inmediato
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.email === selectedUserForRole.email 
            ? { ...user, role: newRole }
            : user
        )
      );
      
      // Actualizar también el usuario seleccionado para el diálogo
      setSelectedUserForRole(prev => ({ ...prev, role: newRole }));
      
      // Actualizar en el servidor
      await updateUser(selectedUserForRole.id, { role: newRole });
      setSnackbar({ open: true, message: 'Rol actualizado exitosamente', severity: 'success' });
      
      // Cerrar diálogo inmediatamente
      handleCloseRoleDialog();
      
      // Refrescar desde el servidor para asegurar consistencia
      await refreshUsers();
    } catch (error) {
      // En caso de error, revertir el cambio optimista
      await refreshUsers();
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  };

  // Nueva función para cambio directo de rol desde el dropdown
  const handleDirectRoleChange = async (userData, newRole) => {
    try {
      // Actualización optimista del estado local para cambio inmediato
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.email === userData.email 
            ? { ...user, role: newRole }
            : user
        )
      );
      
      // Actualizar en el servidor
      await updateUser(userData.id, { role: newRole });
      setSnackbar({ open: true, message: `Rol actualizado a ${getRoleLabel(newRole)} exitosamente`, severity: 'success' });
      
      // Refrescar desde el servidor para asegurar consistencia
      await refreshUsers();
    } catch (error) {
      // En caso de error, revertir el cambio optimista
      await refreshUsers();
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  };

  const getRoleDescription = (role) => {
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
        // Actualizar usuario
        const updates = {
          name: formData.name,
          email: formData.email,
          permissions: formData.permissions.map(p => typeof p === 'string' ? p.toUpperCase() : (p.Name || p.name || String(p)).toUpperCase())
        };
        if (formData.password) {
          updates.password = formData.password;
        }
        await updateUser(editingUser.id, updates);
        setSnackbar({ open: true, message: 'Usuario actualizado exitosamente', severity: 'success' });
      } else {
        // Crear nuevo usuario
        if (!formData.name || !formData.email || !formData.password) {
          setSnackbar({ open: true, message: 'Todos los campos son obligatorios', severity: 'error' });
                  }
        // Crear usuario con permisos asignados
        const newUserData = {
          ...formData,
          permissions: formData.permissions.map(p => typeof p === 'string' ? p.toUpperCase() : (p.Name || p.name || String(p)).toUpperCase()) // Múltiples permisos asignados
        };
        await createUser(newUserData);
        setSnackbar({ open: true, message: 'Usuario creado exitosamente', severity: 'success' });
      }
      await refreshUsers();
      handleCloseDialog();
    } catch (error) {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  };

  const handleToggleStatus = async (userEmail, currentStatus) => {
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
      await refreshUsers(); // Asegura consistencia tras el cambio
      const statusMessage = result.newStatus === 1 ? 'habilitado' : 'deshabilitado';
      setSnackbar({ 
        open: true, 
        message: `Usuario ${statusMessage} exitosamente`, 
        severity: 'success' 
      });
    } catch (error) {
      await refreshUsers();
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  }
};

  const getRoleLabel = (role) => {
    if (!role || role === null || role === '') {
      return 'Sin rol';
    }
    const labels = {
      [ROLES.ADMIN]: 'Administrador',
      [ROLES.UPLOAD_ONLY]: 'Solo Carga',
      [ROLES.DASHBOARD_ONLY]: 'Solo Dashboard',
      [ROLES.FULL_ACCESS]: 'Acceso Completo'
    };
    return labels[role] || role;
  };

  const getRoleColor = (role) => {
    if (!role || role === null || role === '') {
      return 'warning';
    }
    const colors = {
      [ROLES.ADMIN]: 'error',
      [ROLES.UPLOAD_ONLY]: 'primary',
      [ROLES.DASHBOARD_ONLY]: 'secondary',
      [ROLES.FULL_ACCESS]: 'success'
    };
    return colors[role] || 'default';
  };

  // Funciones auxiliares para permisos
  const getPermissionLabel = (permission) => {
    return PERMISSION_LABELS[permission] || permission;
  };

  const getPermissionDescription = (permission) => {
    return PERMISSION_DESCRIPTIONS[permission] || 'Permiso personalizado';
  };

  const getPermissionColor = (permission) => {
    return PERMISSION_COLORS[permission] || 'default';
  };

  const handlePermissionChange = async (userData, newPermissions) => {
    try {
      // Actualización optimista del estado local
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.email === userData.email 
            ? { ...user, permissions: newPermissions }
            : user
        )
      );
      
      // Actualizar en el servidor usando el endpoint de permisos
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
      await refreshUsers(); // Asegura consistencia tras el cambio
    } catch (error) {
      // En caso de error, revertir el cambio optimista
      await refreshUsers();
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  };

  const handleTogglePermission = (permission) => {
    if (!selectedUserForRole) { return; }
    
    const currentPermissions = selectedUserForRole.permissions || [];
    // Siempre obtener el nombre como string
    const permissionName = typeof permission === 'string' ? permission : (permission.Name || permission.name || String(permission));
    
    let newPermissions;
    if (currentPermissions.includes(permissionName)) {
      // Quitar permiso
      newPermissions = currentPermissions.filter(p => p !== permissionName);
    } else {
      // Agregar permiso
      newPermissions = [...currentPermissions, permissionName];
    }
    // Forzar que todos sean strings
    newPermissions = newPermissions.map(p => typeof p === 'string' ? p : (p.Name || p.name || String(p)));
    
    setSelectedUserForRole(prev => ({
      ...prev,
      permissions: newPermissions
    }));
    handlePermissionChange(selectedUserForRole, newPermissions);
  };


  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        background: darkMode
          ? '#23232b'
          : 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
        transition: 'background 0.3s',
        py: 4,
        color: darkMode ? '#fff' : '#181C32',
        fontFamily: 'Inter, Segoe UI, Roboto, sans-serif',
        position: 'relative',
        overflow: 'auto'
      }}
    >
      {/* Decorative background elements */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '200px',
          background: darkMode
            ? 'transparent'
            : 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
          zIndex: 0
        }}
      />
      
      {/* Header con navegación */}
      <Box sx={{ position: 'absolute', top: 24, left: 32, zIndex: 1000 }}>
        <IconButton onClick={() => setMenuOpen(true)} size="large" color="inherit">
          <MenuIcon />
        </IconButton>
        <Drawer anchor="left" open={menuOpen} onClose={() => setMenuOpen(false)}>
  <Box sx={{ width: 260, p: 2 }}>
    <Typography variant="h6" sx={{ mb: 2 }}>Menú</Typography>
    <Button fullWidth sx={{ mb: 1 }} onClick={() => { setSelectedMenu('historial'); setMenuOpen(false); }} disabled={!hasPermission(PERMISSIONS.HISTORIAL_CARGA_ARCHIVOS_COMERCIALES)}>Historial Carga Archivos Comerciales</Button>
<Button fullWidth sx={{ mb: 1 }} onClick={() => { setSelectedMenu('upload'); setMenuOpen(false); }} disabled={!hasPermission(PERMISSIONS.DOCUMENT_UPLOAD)}>Cargar Documentos</Button>
<Button fullWidth sx={{ mb: 1 }} onClick={() => { setSelectedMenu('dashboard'); setMenuOpen(false); }} disabled={!hasPermission(PERMISSIONS.MANAGEMENT_DASHBOARD)}>Dashboard de Gestión</Button>
<Button fullWidth sx={{ mb: 1 }} onClick={() => { setSelectedMenu('usuarios'); setMenuOpen(false); }} disabled={!hasPermission(PERMISSIONS.VIEW_USERS)}>Usuarios</Button>
    <Button fullWidth sx={{ mb: 1 }} onClick={onBack}>Volver</Button>
  </Box>
</Drawer>
      </Box>
      <Box
        sx={{
          position: 'absolute',
          top: 24,
          right: 32,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}
      >
        <DarkModeToggle
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          onLogoClick={onBack}
        />
      </Box>

      {/* Render selected menu view */}
      {selectedMenu === 'historial' && <LoadDocumentsOCbyUserView darkMode={darkMode} />}
{selectedMenu === 'upload' && (
  <>
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 6, mb: 2 }}>
      <img src={logoClaroMedia} alt="Claro Media Data Tech" style={{ width: 180 }} />
    </Box>
    <UploadForm hideHeader={true} />
  </>
)}
{selectedMenu === 'dashboard' && <DashboardGeneral />}
{selectedMenu === 'usuarios' && (
      <Box sx={{ 
        width: '100%', 
        maxWidth: '1400px', 
        margin: '0 auto', 
        pt: 6, 
        px: { xs: 2, sm: 3, md: 4 },
        pb: 4,
        position: 'relative',
        zIndex: 1
      }}>
        {/* Header Section */}
        <Box sx={{ 
          mb: 6,
          textAlign: 'center',
          position: 'relative'
        }}>
          {/* Título principal */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            mb: 3
          }}>
            <Box
              sx={{
                p: 2,
                borderRadius: '50%',
                background: darkMode 
                  ? 'linear-gradient(135deg, #E60026 0%, #B8001B 100%)'
                  : 'linear-gradient(135deg, #000 0%, #222 100%)',
                boxShadow: darkMode 
                  ? '0 8px 32px rgba(230, 0, 38, 0.3)'
                  : '0 8px 32px rgba(0, 0, 0, 0.15)',
                mr: 3
              }}
            >
              <AdminIcon
                sx={{
                  fontSize: 32,
                  color: '#fff'
                }}
              />
            </Box>
            <Box>
              <Typography
                variant="h3"
                fontWeight={800}
                color={darkMode ? '#fff' : '#1a202c'}
                sx={{
                  background: darkMode 
                    ? 'linear-gradient(135deg, #fff 0%, #e2e8f0 100%)'
                    : 'linear-gradient(135deg, #1a202c 0%, #4a5568 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '-0.02em'
                }}
              >
                Panel de Administración
              </Typography>
              <Typography
                variant="subtitle1"
                color={darkMode ? '#a0aec0' : '#718096'}
                fontWeight={500}
                sx={{ mt: 0.5 }}
              >
                Gestión avanzada de usuarios y permisos
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Información del usuario actual */}
        <Paper
          elevation={0}
          sx={{
            p: 4,
            mb: 5,
            background: darkMode 
              ? '#2a2d3a'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
            borderRadius: 4,
            border: darkMode 
              ? '1px solid #35374a'
              : '1px solid #e2e8f0',
            boxShadow: darkMode 
              ? '0 2px 12px #0008'
              : '0 20px 40px rgba(99, 102, 241, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.8)',
            transition: 'all 0.3s'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box
              sx={{
                p: 2,
                borderRadius: 3,
                background: darkMode 
                  ? 'linear-gradient(135deg, rgba(230, 0, 38, 0.2) 0%, rgba(184, 0, 27, 0.2) 100%)'
                  : 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                border: darkMode 
                  ? '1px solid rgba(230, 0, 38, 0.3)'
                  : '1px solid rgba(99, 102, 241, 0.2)'
              }}
            >
              <PersonIcon sx={{ 
                fontSize: 28, 
                color: darkMode ? '#E60026' : '#000' 
              }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography 
                variant="h6" 
                color={darkMode ? '#fff' : '#1a202c'} 
                fontWeight={600}
                sx={{ mb: 0.5 }}
              >
                Sesión Activa
              </Typography>
              <Typography 
                variant="body1"
                color={darkMode ? '#e2e8f0' : '#4a5568'}
                sx={{ lineHeight: 1.6 }}
              >
                Conectado como{' '}
                <Box component="span" sx={{ 
                  fontWeight: 700,
                  color: darkMode ? '#fff' : '#1a202c'
                }}>
                  {user?.name}
                </Box>
                {' '}({user?.email})
              </Typography>
            </Box>
          </Box>
        </Paper>

      {/* Eliminados los botones de documentos y la vista de documentos subidos por usuario */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}></Box>

      {/* Tabla de usuarios */}
      <Box sx={{ px: 0 }}>
          <Paper
          elevation={0}
          sx={{
            background: darkMode 
              ? '#2a2d3a'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
            borderRadius: 4,
            border: darkMode 
              ? '1px solid rgba(230, 0, 38, 0.2)' 
              : '1px solid rgba(99, 102, 241, 0.15)',
            boxShadow: darkMode 
              ? '0 2px 12px #0008'
              : '0 20px 40px rgba(99, 102, 241, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.8)',
            overflow: 'hidden',
            transition: 'all 0.3s'
          }}
        >
          <Box
            sx={{
              p: 4,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: darkMode 
                ? '1px solid rgba(255, 255, 255, 0.1)' 
                : '1px solid rgba(0, 0, 0, 0.08)',
              background: darkMode
                ? 'linear-gradient(135deg, rgba(230, 0, 38, 0.05) 0%, rgba(184, 0, 27, 0.05) 100%)'
                : 'linear-gradient(135deg, rgba(99, 102, 241, 0.03) 0%, rgba(139, 92, 246, 0.03) 100%)'
            }}
          >
            <Box>
              <Typography 
                variant="h5" 
                color={darkMode ? '#fff' : '#1a202c'} 
                fontWeight={700}
                sx={{ mb: 0.5 }}
              >
                Habilitar / Deshabilitar usuarios
              </Typography>
              <Typography 
                variant="body2" 
                color={darkMode ? '#a0aec0' : '#718096'}
                fontWeight={500}
              >
                Administra usuarios y sus permisos del sistema
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                variant="outlined"
                size="small"
                placeholder="Buscar usuario..."
                value={searchUser}
                onChange={e => setSearchUser(e.target.value)}
                sx={{
                  minWidth: 220,
                  background: darkMode ? '#232946' : '#fff',
                  borderRadius: 2,
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: darkMode ? '#E60026' : '#1976d2'
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: darkMode ? '#B8001B' : '#115293'
                  },
                  '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: darkMode ? '#E60026' : '#1976d2'
                  }
                }}
                InputProps={{
                  style: {
                    color: darkMode ? '#fff' : '#1a202c',
                    fontWeight: 500
                  }
                }}
              />
              <Button
  variant="contained"
  startIcon={<AddIcon />}
  onClick={() => handleOpenDialog()}
  disabled={false}
  sx={{
    background: 'linear-gradient(135deg, #E60026 0%, #B8001B 100%)',
    color: '#fff',
    fontWeight: 600,
    px: 4,
    py: 1.5,
    borderRadius: 3,
    textTransform: 'none',
    fontSize: '0.95rem',
    boxShadow: '0 8px 24px rgba(230, 0, 38, 0.3)',
    border: 'none',
    outline: 'none',
    '&:hover': {
      background: 'linear-gradient(135deg, #B8001B 0%, #E60026 100%)',
      transform: 'translateY(-2px)',
      boxShadow: '0 12px 32px rgba(230, 0, 38, 0.4)'
    }
  }}
>
  Nuevo Usuario
</Button>
            </Box>
          </Box>

          <TableContainer sx={{ maxHeight: '600px' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ 
                    background: darkMode 
                      ? 'linear-gradient(135deg, rgba(230, 0, 38, 0.1) 0%, rgba(184, 0, 27, 0.1) 100%)'
                      : 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
                    color: darkMode ? '#fff' : '#1a202c', 
                    fontWeight: 700, 
                    py: 3,
                    fontSize: '0.95rem',
                    borderBottom: darkMode 
                      ? '2px solid rgba(230, 0, 38, 0.2)'
                      : '2px solid rgba(99, 102, 241, 0.2)',
                    backdropFilter: 'blur(10px)'
                  }}>
                    Usuario
                  </TableCell>
                  <TableCell sx={{ 
                    background: darkMode 
                      ? 'linear-gradient(135deg, rgba(230, 0, 38, 0.1) 0%, rgba(184, 0, 27, 0.1) 100%)'
                      : 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
                    color: darkMode ? '#fff' : '#1a202c', 
                    fontWeight: 700, 
                    py: 3,
                    fontSize: '0.95rem',
                    borderBottom: darkMode 
                      ? '2px solid rgba(230, 0, 38, 0.2)'
                      : '2px solid rgba(99, 102, 241, 0.2)',
                    backdropFilter: 'blur(10px)'
                  }}>
                    Email
                  </TableCell>
                  <TableCell sx={{ 
                    background: darkMode 
                      ? 'linear-gradient(135deg, rgba(230, 0, 38, 0.1) 0%, rgba(184, 0, 27, 0.1) 100%)'
                      : 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
                    color: darkMode ? '#fff' : '#1a202c', 
                    fontWeight: 700, 
                    py: 3,
                    fontSize: '0.95rem',
                    borderBottom: darkMode 
                      ? '2px solid rgba(230, 0, 38, 0.2)'
                      : '2px solid rgba(99, 102, 241, 0.2)',
                    backdropFilter: 'blur(10px)'
                  }}>
                    Permisos
                  </TableCell>
                  <TableCell sx={{ 
                    background: darkMode 
                      ? 'linear-gradient(135deg, rgba(230, 0, 38, 0.1) 0%, rgba(184, 0, 27, 0.1) 100%)'
                      : 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
                    color: darkMode ? '#fff' : '#1a202c', 
                    fontWeight: 700, 
                    py: 3,
                    fontSize: '0.95rem',
                    borderBottom: darkMode 
                      ? '2px solid rgba(230, 0, 38, 0.2)'
                      : '2px solid rgba(99, 102, 241, 0.2)',
                    backdropFilter: 'blur(10px)',
                    textAlign: 'center'
                  }}>
                    Estado
                  </TableCell>
                  <TableCell sx={{ 
                    background: darkMode 
                      ? 'linear-gradient(135deg, rgba(230, 0, 38, 0.1) 0%, rgba(184, 0, 27, 0.1) 100%)'
                      : 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
                    color: darkMode ? '#fff' : '#1a202c', 
                    fontWeight: 700, 
                    py: 3,
                    fontSize: '0.95rem',
                    borderBottom: darkMode 
                      ? '2px solid rgba(230, 0, 38, 0.2)'
                      : '2px solid rgba(99, 102, 241, 0.2)',
                    backdropFilter: 'blur(10px)',
                    textAlign: 'center'
                  }}>
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(() => {
                  const filteredUsers = users.filter(u =>
                    !searchUser ||
                    u.name?.toLowerCase().includes(searchUser.toLowerCase()) ||
                    u.email?.toLowerCase().includes(searchUser.toLowerCase())
                  );
                  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
                  const paginatedUsers = filteredUsers.slice((currentPage - 1) * usersPerPage, currentPage * usersPerPage);
                  return paginatedUsers.map((userData, index) => (
                    <TableRow 
                      key={userData.id ? `user-${userData.id}` : userData.email ? `user-${userData.email}` : `user-${index}`}
                      sx={{
                        background: darkMode
                          ? index % 2 === 0 
                            ? 'rgba(255, 255, 255, 0.02)'
                            : 'rgba(255, 255, 255, 0.01)'
                          : index % 2 === 0
                            ? 'rgba(248, 250, 252, 0.5)'
                            : 'rgba(255, 255, 255, 0.8)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                          background: darkMode 
                            ? 'linear-gradient(135deg, rgba(230, 0, 38, 0.08) 0%, rgba(184, 0, 27, 0.08) 100%)'
                            : 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
                          transform: 'translateY(-1px)',
                          boxShadow: darkMode
                            ? '0 4px 12px rgba(0, 0, 0, 0.15)'
                            : '0 4px 12px rgba(99, 102, 241, 0.15)'
                        },
                        borderBottom: darkMode 
                          ? '1px solid rgba(255, 255, 255, 0.05)' 
                          : '1px solid rgba(0, 0, 0, 0.05)'
                      }}
                    >
                      <TableCell sx={{ py: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box
                            sx={{
                              p: 1.5,
                              borderRadius: 2,
                              background: darkMode 
                                ? 'linear-gradient(135deg, rgba(230, 0, 38, 0.15) 0%, rgba(184, 0, 27, 0.15) 100%)'
                                : 'linear-gradient(135deg, rgba(0, 0, 0, 0.1) 0%, rgba(34, 34, 34, 0.1) 100%)',
                              mr: 2
                            }}
                          >
                            <PersonIcon sx={{ 
                              fontSize: 20, 
                              color: darkMode ? '#E60026' : '#6366f1' 
                            }} />
                          </Box>
                          <Typography 
                            color={darkMode ? '#fff' : '#1a202c'}
                            fontWeight={600}
                            fontSize="0.95rem"
                          >
                            {userData.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 3 }}>
                        <Typography 
                          color={darkMode ? '#e2e8f0' : '#4a5568'}
                          fontSize="0.9rem"
                          fontWeight={500}
                        >
                          {userData.email}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 3 }}>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, maxWidth: 300 }}>
                          {userData.permissions && Array.isArray(userData.permissions) && userData.permissions.length > 0 ? (
  Array.from(new Set(userData.permissions.map(p => typeof p === 'string' ? p : p.Name || p.name))).map((permissionName, permIdx) => (
    <Chip
      key={`perm-${permissionName}-${permIdx}`}
      label={getPermissionLabel(permissionName)}
      color={getPermissionColor(permissionName)}
      size="small"
      sx={{ 
        fontWeight: 600,
        fontSize: '0.75rem',
        borderRadius: 2,
        color: darkMode ? '#fff' : '#181C32',
        '& .MuiChip-label': {
          px: 1.5,
          py: 0.5
        }
      }}
    />
  ))
) : userData.role ? (
                            <Chip
                              label={getRoleLabel(userData.role)}
                              color={getRoleColor(userData.role)}
                              size="small"
                              sx={{ 
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                borderRadius: 2
                              }}
                            />
                          ) : (
                            <Typography 
                              variant="body2" 
                              color={darkMode ? '#a0aec0' : '#718096'}
                              sx={{ 
                                fontStyle: 'italic',
                                fontSize: '0.85rem'
                              }}
                            >
                              Sin permisos asignados
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 3, textAlign: 'center' }}>
                        <Chip
                          label={userData.status === 1 ? 'Habilitado' : 'Deshabilitado'}
                          color={userData.status === 1 ? 'success' : 'error'}
                          size="small"
                          sx={{ 
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            borderRadius: 2,
                            '& .MuiChip-label': {
                              px: 1.5,
                              py: 0.5
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ py: 3, textAlign: 'center' }}>
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                          {hasPermission(PERMISSIONS.EDIT_USER) && (
  <IconButton
    onClick={() => handleOpenDialog(userData)}
    sx={{
      background: darkMode 
        ? 'linear-gradient(135deg, rgba(66, 153, 225, 0.15) 0%, rgba(49, 130, 206, 0.15) 100%)'
        : 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
      color: darkMode ? '#fff' : '#000',
      border: darkMode 
        ? '1px solid rgba(66, 153, 225, 0.3)'
        : '1px solid rgba(0, 0, 0, 0.2)',
      borderRadius: 2,
      p: 1,
      '&:hover': {
        background: darkMode 
          ? 'linear-gradient(135deg, rgba(66, 153, 225, 0.25) 0%, rgba(49, 130, 206, 0.25) 100%)'
          : 'linear-gradient(135deg, rgba(0, 0, 0, 0.15) 0%, rgba(34, 34, 34, 0.15) 100%)',
        transform: 'translateY(-1px)'
      }
    }}
    title="Editar usuario y gestionar permisos"
  >
    <EditIcon fontSize="small" />
  </IconButton>
)}

                          {userData.email !== user?.email && hasPermission(PERMISSIONS.EDIT_USER) && (
  <IconButton
    onClick={() => handleToggleStatus(userData.email, userData.status)}
    sx={{ 
      background: userData.status === 1 
        ? (darkMode 
          ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(22, 163, 74, 0.15) 100%)'
          : 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.1) 100%)')
        : (darkMode 
          ? 'linear-gradient(135deg, rgba(229, 62, 62, 0.15) 0%, rgba(197, 48, 48, 0.15) 100%)'
          : 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)'),
      color: userData.status === 1 
        ? (darkMode ? '#22c55e' : '#22c55e')
        : (darkMode ? '#ef4444' : '#ef4444'),
      border: userData.status === 1 
        ? (darkMode 
          ? '1px solid rgba(34, 197, 94, 0.3)'
          : '1px solid rgba(34, 197, 94, 0.2)')
        : (darkMode 
          ? '1px solid rgba(239, 68, 68, 0.3)'
          : '1px solid rgba(239, 68, 68, 0.2)'),
      borderRadius: 2,
      p: 1,
      '&:hover': {
        background: userData.status === 1 
          ? (darkMode 
            ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.25) 0%, rgba(22, 163, 74, 0.25) 100%)'
            : 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(22, 163, 74, 0.15) 100%)')
          : (darkMode 
            ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(220, 38, 38, 0.25) 100%)'
            : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.15) 100%)'),
        transform: 'translateY(-1px)'
      }
    }}
    title={userData.status === 1 ? "Deshabilitar usuario" : "Habilitar usuario"}
  >
    {userData.status === 1 ? <CheckCircleIcon fontSize="small" /> : <BlockIcon fontSize="small" />}
  </IconButton>
)}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ));
                })()}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 2 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            sx={{ mx: 1, borderColor: darkMode ? '#E60026' : '#181C32', color: darkMode ? '#E60026' : '#181C32', '&:hover': { borderColor: darkMode ? '#B8001B' : '#232946', backgroundColor: darkMode ? 'rgba(230, 0, 38, 0.1)' : 'rgba(24, 28, 50, 0.1)' } }}
          >
            &#8592; Anterior
          </Button>
          <Typography sx={{ mx: 2 }}>
            Página {currentPage} de {Math.ceil(users.filter(u =>
              !searchUser || 
              u.name?.toLowerCase().includes(searchUser.toLowerCase()) ||
              u.email?.toLowerCase().includes(searchUser.toLowerCase())
            ).length / usersPerPage) || 1}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(users.filter(u =>
              !searchUser || 
              u.name?.toLowerCase().includes(searchUser.toLowerCase()) ||
              u.email?.toLowerCase().includes(searchUser.toLowerCase())
            ).length / usersPerPage) || 1))}
            disabled={currentPage === (Math.ceil(users.filter(u =>
              !searchUser || 
              u.name?.toLowerCase().includes(searchUser.toLowerCase()) ||
              u.email?.toLowerCase().includes(searchUser.toLowerCase())
            ).length / usersPerPage) || 1) || (users.filter(u =>
              !searchUser || 
              u.name?.toLowerCase().includes(searchUser.toLowerCase()) ||
              u.email?.toLowerCase().includes(searchUser.toLowerCase())
            ).length === 0)}
            sx={{ mx: 1, borderColor: darkMode ? '#E60026' : '#181C32', color: darkMode ? '#E60026' : '#181C32', '&:hover': { borderColor: darkMode ? '#B8001B' : '#232946', backgroundColor: darkMode ? 'rgba(230, 0, 38, 0.1)' : 'rgba(24, 28, 50, 0.1)' } }}
          >
            Siguiente &#8594;
          </Button>
        </Box>

        {/* Sección de Historial de Accesos */}
        <Box sx={{ px: 0, mt: 4 }}>
          <Paper
            elevation={0}
            sx={{
              background: darkMode ? '#2a2d3a' : '#f8fafc',
              borderRadius: 3,
              border: darkMode ? '1px solid rgba(230, 0, 38, 0.2)' : '1px solid rgba(24, 28, 50, 0.1)',
              boxShadow: darkMode ? '0 2px 12px #0008' : '0 8px 32px rgba(24, 28, 50, 0.08)',
              overflow: 'hidden',
              transition: 'all 0.3s'
            }}
          >
            <Box
              sx={{
                p: 3,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: showAccessHistory ? `1px solid ${darkMode ? 'rgba(230, 0, 38, 0.2)' : '#e0e0e0'}` : 'none'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <HistoryIcon sx={{ mr: 2, color: darkMode ? '#E60026' : '#181C32' }} />
                <Typography variant="h6" color={darkMode ? '#fff' : '#000'}>
                  Historial de Accesos
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {showAccessHistory && (
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={loadAccessHistory}
                    sx={{
                      borderColor: darkMode ? '#E60026' : '#181C32',
                      color: darkMode ? '#E60026' : '#181C32',
                      '&:hover': {
                        borderColor: darkMode ? '#B8001B' : '#232946',
                        backgroundColor: darkMode ? 'rgba(230, 0, 38, 0.1)' : 'rgba(24, 28, 50, 0.1)'
                      }
                    }}
                  >
                    Actualizar
                  </Button>
                )}
                <Button
                  variant="contained"
                  startIcon={showAccessHistory ? <AccessTimeIcon /> : <HistoryIcon />}
                  onClick={handleToggleAccessHistory}
                  sx={{
                    background: darkMode ? '#E60026' : '#181C32',
                    '&:hover': {
                      background: darkMode ? '#B8001B' : '#232946'
                    }
                  }}
                >
                  {showAccessHistory ? 'Ocultar Historial' : 'Ver Historial'}
                </Button>
              </Box>
            </Box>

            {showAccessHistory && (
              <Box sx={{ p: 0 }}>
                {accessHistory.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <AccessTimeIcon sx={{ fontSize: 48, color: darkMode ? '#CBD5E0' : '#999', mb: 2 }} />
                    <Typography color={darkMode ? '#CBD5E0' : '#666'}>
                      No hay registros de acceso disponibles
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer sx={{ maxHeight: 400 }}>
                    <Table stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ color: darkMode ? '#CBD5E0' : '#666', fontWeight: 600, backgroundColor: darkMode ? '#2D3748' : '#f5f5f5' }}>
                            Usuario
                          </TableCell>
                          <TableCell sx={{ color: darkMode ? '#CBD5E0' : '#666', fontWeight: 600, backgroundColor: darkMode ? '#2D3748' : '#f5f5f5' }}>
                            Email
                          </TableCell>
                          <TableCell sx={{ color: darkMode ? '#CBD5E0' : '#666', fontWeight: 600, backgroundColor: darkMode ? '#2D3748' : '#f5f5f5' }}>
                            Fecha y Hora de Acceso
                          </TableCell>
                          <TableCell sx={{ color: darkMode ? '#CBD5E0' : '#666', fontWeight: 600, backgroundColor: darkMode ? '#2D3748' : '#f5f5f5' }}>
                            Origen
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {accessHistory.slice(0, 50).map((record, index) => {
                          const userInfo = users.find(u => u.email === record.email) || { name: 'Usuario no encontrado' };
                          return (
                            <TableRow key={`${record.email}-${record.loginTime || record.timestamp || Date.now()}-${index}`}>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <PersonIcon sx={{ mr: 1, color: darkMode ? '#CBD5E0' : '#666' }} />
                                  <Typography color={darkMode ? '#fff' : '#000'}>
                                    {userInfo.name}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography color={darkMode ? '#CBD5E0' : '#666'}>
                                  {record.email}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography color={darkMode ? '#CBD5E0' : '#666'}>
                                  {formatLoginTime(record.loginTime)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={record.source === 'backend' ? 'Servidor' : 'Cliente'}
                                  size="small"
                                  sx={{
                                    backgroundColor: record.source === 'backend' 
                                      ? (darkMode ? '#2B6CB0' : '#3182CE')
                                      : (darkMode ? '#38A169' : '#48BB78'),
                                    color: '#fff',
                                    fontWeight: 500
                                  }}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
                {accessHistory.length > 50 && (
                  <Box sx={{ p: 2, textAlign: 'center', borderTop: `1px solid ${darkMode ? '#2D3748' : '#e0e0e0'}` }}>
                    <Typography variant="caption" color={darkMode ? '#CBD5E0' : '#666'}>
                      Mostrando los 50 accesos más recientes de {accessHistory.length} registros totales
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Paper>
        </Box>
      </Box>
      )}

      {/* Dialog para crear/editar usuario */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: darkMode ? '#2a2d3a' : '#f8fafc',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
            overflow: 'hidden',
            width: '100%',
              maxWidth: 500,
              margin: 'auto'
          }
        }}
      >
        <Box
          sx={{
            background: darkMode ? '#2a2d3a' : '#f8fafc',
            p: 3,
            textAlign: 'center',
            position: 'relative',
            borderBottom: `1px solid ${darkMode ? '#2D3748' : '#e0e0e0'}`
          }}
        >
          <PersonIcon 
            sx={{ 
              fontSize: 40, 
              color: darkMode ? '#E60026' : '#181C32', 
              mb: 1.5,
              background: darkMode ? 'rgba(230, 0, 38, 0.1)' : 'rgba(24, 28, 50, 0.1)',
              borderRadius: '50%',
              p: 1
            }} 
          />
          <Typography 
            variant="h5" 
            sx={{ 
              color: darkMode ? '#fff' : '#181C32', 
              fontWeight: 700
            }}
          >
            {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
          </Typography>
          <Typography 
            variant="subtitle1" 
            sx={{ 
              color: darkMode ? '#CBD5E0' : '#666', 
              mt: 1,
              fontWeight: 400
            }}
          >
            {editingUser ? 'Modifica la información del usuario' : 'Completa los datos para crear un nuevo usuario'}
          </Typography>
        </Box>
        
        <DialogContent sx={{ p: 3, background: darkMode ? '#2a2d3a' : '#f8fafc' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              fullWidth
              label="Nombre"
              placeholder="Ingresa el nombre completo"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  background: darkMode ? '#2D3748' : '#fff',
                  '& fieldset': {
                    borderColor: darkMode ? '#4A5568' : '#e0e0e0',
                    borderWidth: 2
                  },
                  '&:hover fieldset': {
                    borderColor: darkMode ? '#E60026' : '#181C32'
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: darkMode ? '#E60026' : '#181C32',
                    borderWidth: 2
                  }
                },
                '& .MuiInputLabel-root': {
                  color: darkMode ? '#CBD5E0' : '#666',
                  fontWeight: 600
                },
                '& .MuiOutlinedInput-input': {
                  color: darkMode ? '#fff' : '#000',
                  fontSize: '1.1rem',
                  py: 2
                }
              }}
            />
            
            <TextField
              fullWidth
              label="Email"
              type="email"
              placeholder="usuario@ejemplo.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={!!editingUser}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  background: editingUser ? (darkMode ? '#1A202C' : '#f5f5f5') : (darkMode ? '#2D3748' : '#fff'),
                  '& fieldset': {
                    borderColor: darkMode ? '#4A5568' : '#e0e0e0',
                    borderWidth: 2
                  },
                  '&:hover fieldset': {
                    borderColor: editingUser ? (darkMode ? '#4A5568' : '#e0e0e0') : (darkMode ? '#E60026' : '#181C32')
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: darkMode ? '#E60026' : '#181C32',
                    borderWidth: 2
                  }
                },
                '& .MuiInputLabel-root': {
                  color: darkMode ? '#CBD5E0' : '#666',
                  fontWeight: 600
                },
                '& .MuiOutlinedInput-input': {
                  color: darkMode ? '#fff' : '#000',
                  fontSize: '1.1rem',
                  py: 2
                }
              }}
            />
            
            <TextField
              fullWidth
              label={editingUser ? 'Nueva Contraseña (opcional)' : 'Contraseña'}
              type="password"
              placeholder={editingUser ? 'Dejar vacío para mantener actual' : 'Mínimo 6 caracteres'}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  background: darkMode ? '#2D3748' : '#fff',
                  '& fieldset': {
                    borderColor: darkMode ? '#4A5568' : '#e0e0e0',
                    borderWidth: 2
                  },
                  '&:hover fieldset': {
                    borderColor: darkMode ? '#E60026' : '#181C32'
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: darkMode ? '#E60026' : '#181C32',
                    borderWidth: 2
                  }
                },
                '& .MuiInputLabel-root': {
                  color: darkMode ? '#CBD5E0' : '#666',
                  fontWeight: 600
                },
                '& .MuiOutlinedInput-input': {
                  color: darkMode ? '#fff' : '#000',
                  fontSize: '1.1rem',
                  py: 2
                }
              }}
            />
            

            {/* Gestión individual de permisos */}
            {editingUser && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" color={darkMode ? '#fff' : '#000'} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SecurityIcon sx={{ color: darkMode ? '#F6AD55' : '#FF8C00' }} />
                  Gestión Individual de Permisos
                </Typography>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, maxWidth: 500, width: '100%', margin: '0 auto' }}>
  {(availablePermissions.length > 0 ? availablePermissions : Object.values(PERMISSIONS)).map((permission, idx) => {
    const permissionName = permission.name || permission.Name || permission;
    const isSelected = formData.permissions?.includes(permissionName) || false;
    return (
      <Paper
        key={`perm-paper-${permissionName}-${idx}`}
        elevation={0}
        sx={{
          p: 1,
          width: '100%',
          maxWidth: 500,
          minHeight: 48,
          cursor: 'pointer',
          borderRadius: 4,
          border: '2px solid',
          borderColor: darkMode ? '#181C32' : '#181C32',
          background: darkMode ? '#232946' : '#fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          boxShadow: 'none',
          margin: '0 auto',
          overflow: 'visible',
          transition: 'all 0.3s ease',
          '&:hover': {
            background: darkMode ? '#2D3748' : '#f1f3f4',
            borderColor: darkMode ? '#E60026' : '#181C32',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }
        }}
        onClick={() => {
  const currentPermissions = formData.permissions || [];
  const permissionNameStr = typeof permissionName === 'string' ? permissionName : String(permissionName);
  let newPermissions;
  if (currentPermissions.includes(permissionNameStr)) {
    newPermissions = currentPermissions.filter(p => p !== permissionNameStr);
  } else {
    newPermissions = [...currentPermissions, permissionNameStr];
  }
  const uniquePermissions = Array.from(new Set(newPermissions.map(p => typeof p === 'string' ? p : String(p))));
  setFormData({ ...formData, permissions: uniquePermissions });
}}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
          <Typography variant="subtitle1" fontWeight={700} color={darkMode ? '#fff' : '#181C32'} sx={{ mb: 0.5, fontSize: '1rem' }}>
            {getPermissionLabel(permissionName)}
          </Typography>
          <Typography variant="body2" color={darkMode ? '#CBD5E0' : '#666'} sx={{ fontStyle: 'italic', fontSize: '0.95rem', mb: 1 }}>
            {typeof (permission.description || permission.Description) === 'string' ? (permission.description || permission.Description) : (typeof getPermissionDescription(permissionName) === 'string' ? getPermissionDescription(permissionName) : JSON.stringify(getPermissionDescription(permissionName)))}
          </Typography>
          <Chip
            label={isSelected ? 'Asignado' : 'No asignado'}
            color={isSelected ? 'success' : 'default'}
            size="small"
            sx={{ fontWeight: 700, fontSize: '0.85rem', px: 1.5, borderRadius: 1.5, boxShadow: isSelected ? '0 2px 8px rgba(46,204,113,0.12)' : 'none', mt: 1 }}
          />
        </Box>
      </Paper>
    );
  })}
</Box>
              </Box>
            )}

          </Box>
        </DialogContent>
        
        <DialogActions 
           sx={{ 
             p: 3, 
             background: darkMode ? '#4A5568' : '#fff',
             borderTop: `1px solid ${darkMode ? '#2D3748' : '#e0e0e0'}`,
             gap: 2,
             justifyContent: 'center'
           }}
         >
           <Button 
             onClick={handleCloseDialog} 
             variant="outlined"
             sx={{ 
               borderRadius: 2,
               px: 3,
               py: 1,
               fontSize: '0.9rem',
               fontWeight: 600,
               borderColor: darkMode ? '#4A5568' : '#e0e0e0',
               color: darkMode ? '#CBD5E0' : '#666',
               '&:hover': {
                 borderColor: darkMode ? '#E60026' : '#181C32',
                 color: darkMode ? '#E60026' : '#181C32'
               }
             }}
           >
             CANCELAR
           </Button>
           <Button
             onClick={handleSubmit}
             disabled={!formData.name || !formData.email || (!editingUser ? !formData.password : false)}
             variant="contained"
             sx={{
               borderRadius: 2,
               px: 3,
               py: 1,
               fontSize: '0.9rem',
               fontWeight: 600,
               background: darkMode ? '#E60026' : '#181C32',
               '&:hover': {
                 background: darkMode ? '#B8001B' : '#232946'
               },
               '&:disabled': {
                 background: darkMode ? 'rgba(230, 0, 38, 0.3)' : 'rgba(24, 28, 50, 0.3)',
                 color: 'rgba(255, 255, 255, 0.5)'
               }
             }}
           >
             {editingUser ? 'ACTUALIZAR' : 'CREAR'}
           </Button>
         </DialogActions>
      </Dialog>

      {/* Dialog para gestionar roles y permisos */}
      <Dialog
        open={openRoleDialog}
        onClose={handleCloseRoleDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: darkMode ? '#4A5568' : '#fff',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
            overflow: 'hidden',
            maxWidth: '500px',
            margin: 'auto'
          }
        }}
      >
        <DialogTitle
          sx={{
            background: darkMode ? '#2D3748' : '#f8fafc',
            borderBottom: `1px solid ${darkMode ? '#4A5568' : '#e0e0e0'}`,
            p: 3
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <SecurityIcon sx={{ color: darkMode ? '#F6AD55' : '#FF8C00', fontSize: 28 }} />
            <Typography variant="h6" fontWeight={700} color={darkMode ? '#fff' : '#000'}>
              Gestionar Permisos
            </Typography>
          </Box>
          {selectedUserForRole && (
            <Typography variant="body2" color={darkMode ? '#CBD5E0' : '#666'} sx={{ mt: 1 }}>
              Usuario: {selectedUserForRole.name} ({selectedUserForRole.email})
            </Typography>
          )}
        </DialogTitle>
        
        <DialogContent sx={{ p: 3, background: darkMode ? '#4A5568' : '#f8fafc' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Typography variant="h6" color={darkMode ? '#fff' : '#000'} sx={{ mb: 1 }}>
              Seleccionar Permisos
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {(availablePermissions.length > 0 ? availablePermissions : Object.values(PERMISSIONS)).map((permission, idx) => {
                const permissionName = permission.Name || permission;
                const isSelected = selectedUserForRole?.permissions?.includes(permissionName) || false;
                return (
                  <Paper
                    key={`role-perm-paper-${permissionName}-${idx}`}
                    elevation={isSelected ? 4 : 1}
                    sx={{
                      p: 1,
                      minHeight: 48,
                      maxWidth: '500px',
                      width: '100%',
                      margin: '0 auto',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      border: isSelected 
                        ? `2px solid ${darkMode ? '#E60026' : '#181C32'}` 
                        : `2px solid ${darkMode ? '#4A5568' : '#e0e0e0'}`,
                      background: isSelected 
                        ? (darkMode ? '#2D3748' : '#f0f9ff') 
                        : (darkMode ? '#1A202C' : '#fff'),
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                      }
                    }}
                    onClick={() => handleTogglePermission(permission)}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={600} color={darkMode ? '#fff' : '#000'}>
                          {getPermissionLabel(permissionName)}
                        </Typography>
                        <Typography variant="body2" color={darkMode ? '#CBD5E0' : '#666'}>
                          {typeof getPermissionDescription(permissionName) === 'string' ? getPermissionDescription(permissionName) : JSON.stringify(getPermissionDescription(permissionName))}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={isSelected ? 'Asignado' : 'No asignado'}
                          color={isSelected ? 'success' : 'default'}
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                        <Chip
                          label={getPermissionLabel(permissionName)}
                          color={getPermissionColor(permissionName)}
                          size="small"
                        />
                      </Box>
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions 
          sx={{ 
            p: 3, 
            background: darkMode ? '#4A5568' : '#fff',
            borderTop: `1px solid ${darkMode ? '#2D3748' : '#e0e0e0'}`,
            gap: 2,
            justifyContent: 'center'
          }}
        >
          <Button
            onClick={handleCloseRoleDialog}
            variant="outlined"
            sx={{
              borderRadius: 2,
              px: 3,
              py: 1,
              fontSize: '0.9rem',
              fontWeight: 600,
              borderColor: darkMode ? '#4A5568' : '#e0e0e0',
              color: darkMode ? '#CBD5E0' : '#666',
              '&:hover': {
                borderColor: darkMode ? '#E60026' : '#181C32',
                background: 'transparent'
              }
            }}
          >
            CERRAR
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para notificaciones */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default AdminPanel;


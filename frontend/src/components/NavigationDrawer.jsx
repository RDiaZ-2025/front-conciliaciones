import React from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  IconButton,
  CircularProgress
} from '@mui/material';
import {
  Menu as MenuIcon,
  History as HistoryIcon,
  Upload as UploadIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  ArrowBack as ArrowBackIcon,
  Close as CloseIcon,
  Assignment as AssignmentIcon,
  Image as ImageIcon,
  MenuBook as MenuBookIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { PERMISSIONS } from '../constants/auth';
import { useMenuItems } from '../hooks/useMenuItems';

const NavigationDrawer = ({
  open,
  onClose,
  onMenuSelect,
  onBack,
  darkMode
}) => {
  const { hasPermission } = useAuth();
  const { menuItems: dbMenuItems, loading, error } = useMenuItems();

  // Permission mapping for menu items
  const getPermissionForMenuItem = (item) => {
    const permissionMap = {
      'historial': PERMISSIONS.HISTORY_LOAD_COMMERCIAL_FILES,
      'upload': PERMISSIONS.DOCUMENT_UPLOAD,
      'dashboard': PERMISSIONS.MANAGEMENT_DASHBOARD,
      'production': PERMISSIONS.PRODUCTION_MANAGEMENT,
      'usuarios': PERMISSIONS.ADMIN_PANEL,
      'portada15': PERMISSIONS.PORTADA_15_MINUTOS,
      'menu-management': PERMISSIONS.MANAGE_MENUS
    };

    if (permissionMap[item.id]) {
      return permissionMap[item.id];
    }

    // Fallback mapping by label for database items (which have numeric IDs)
    const permissionMapByLabel = {
      'Historial Carga Archivos': PERMISSIONS.HISTORY_LOAD_COMMERCIAL_FILES,
      'Cargar Documentos': PERMISSIONS.DOCUMENT_UPLOAD,
      'Dashboard de Gestión': PERMISSIONS.MANAGEMENT_DASHBOARD,
      'Producción': PERMISSIONS.PRODUCTION_MANAGEMENT,
      'Usuarios': PERMISSIONS.ADMIN_PANEL,
      'Portada 15 Minutos': PERMISSIONS.PORTADA_15_MINUTOS,
      'Gestión de Menús': PERMISSIONS.MANAGE_MENUS
    };

    return permissionMapByLabel[item.label];
  };

  const defaultMenuItems = [
    {
      id: 'historial',
      label: 'Historial Carga Archivos',
      icon: <HistoryIcon />,
      permission: PERMISSIONS.HISTORY_LOAD_COMMERCIAL_FILES
    },
    {
      id: 'upload',
      label: 'Cargar Documentos',
      icon: <UploadIcon />,
      permission: PERMISSIONS.DOCUMENT_UPLOAD
    },
    {
      id: 'dashboard',
      label: 'Dashboard de Gestión',
      icon: <DashboardIcon />,
      permission: PERMISSIONS.MANAGEMENT_DASHBOARD
    },
    {
      id: 'production',
      label: 'Producción',
      icon: <AssignmentIcon />,
      permission: PERMISSIONS.PRODUCTION_MANAGEMENT
    },
    {
      id: 'portada15',
      label: 'Portada 15 Minutos',
      icon: <ImageIcon />,
      permission: PERMISSIONS.PORTADA_15_MINUTOS
    },
    {
      id: 'menu-management',
      label: 'Gestión de Menús',
      icon: <MenuBookIcon />,
      permission: PERMISSIONS.MANAGE_MENUS
    },
    {
      id: 'usuarios',
      label: 'Usuarios',
      icon: <PeopleIcon />,
      permission: PERMISSIONS.ADMIN_PANEL
    }
  ];

  // Use database menu items if available, otherwise fall back to default
  const items = dbMenuItems && dbMenuItems.length > 0 ? dbMenuItems.map(item => {
    // Map icon names to actual icon components
    const iconMap = {
      'HistoryIcon': HistoryIcon,
      'UploadIcon': UploadIcon,
      'DashboardIcon': DashboardIcon,
      'PeopleIcon': PeopleIcon,
      'AssignmentIcon': AssignmentIcon,
      'ImageIcon': ImageIcon,
      'MenuBookIcon': MenuBookIcon
    };

    const IconComponent = iconMap[item.icon] || AssignmentIcon;

    return {
      ...item,
      icon: <IconComponent />,
      permission: getPermissionForMenuItem(item) // Update to pass the whole item
    };
  }) : defaultMenuItems;

  const handleMenuItemClick = (item) => {
    if (onMenuSelect) {
      // Pass the item's label as the menu ID for proper mapping in App.jsx
      onMenuSelect(item.label);
    }
    onClose();
  };

  const handleBackClick = () => {
    if (onBack) {
      onBack();
    }
    onClose();
  };

  return (
    <>
      <Drawer
        anchor="left"
        open={open}
        onClose={onClose}
        sx={{
          '& .MuiDrawer-paper': {
            width: 280,
            bgcolor: darkMode ? 'grey.900' : 'background.paper',
            color: darkMode ? 'common.white' : 'text.primary'
          }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 'bold',
                color: darkMode ? 'common.white' : 'text.primary'
              }}
            >
              Menú de Navegación
            </Typography>
            <IconButton
              onClick={onClose}
              size="small"
              sx={{ color: darkMode ? 'common.white' : 'text.primary' }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          <Divider sx={{ mb: 2, bgcolor: darkMode ? 'grey.700' : 'divider' }} />

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : error ? (
            <Box sx={{ p: 2 }}>
              <Typography variant="body2" color="error">
                Error cargando menús: {error}
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {items.map((item) => {
                const isDisabled = item.permission && !hasPermission(item.permission);

                return (
                  <ListItem key={item.id} disablePadding sx={{ mb: 1 }}>
                    <ListItemButton
                      onClick={() => handleMenuItemClick(item)}
                      disabled={isDisabled}
                      sx={{
                        borderRadius: 2,
                        '&:hover': {
                          bgcolor: darkMode ? 'grey.800' : 'action.hover'
                        },
                        '&.Mui-disabled': {
                          opacity: 0.5
                        }
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          color: isDisabled
                            ? (darkMode ? 'grey.600' : 'action.disabled')
                            : (darkMode ? 'common.white' : 'primary.main'),
                          minWidth: 40
                        }}
                      >
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        sx={{
                          '& .MuiListItemText-primary': {
                            fontSize: '0.95rem',
                            fontWeight: 500,
                            color: isDisabled
                              ? (darkMode ? 'grey.600' : 'action.disabled')
                              : (darkMode ? 'common.white' : 'text.primary')
                          }
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}

              {onBack && (
                <>
                  <Divider sx={{ my: 2, bgcolor: darkMode ? 'grey.700' : 'divider' }} />
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={handleBackClick}
                      sx={{
                        borderRadius: 2,
                        '&:hover': {
                          bgcolor: darkMode ? 'grey.800' : 'action.hover'
                        }
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          color: darkMode ? 'common.white' : 'primary.main',
                          minWidth: 40
                        }}
                      >
                        <ArrowBackIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary="Salir"
                        sx={{
                          '& .MuiListItemText-primary': {
                            fontSize: '0.95rem',
                            fontWeight: 500,
                            color: darkMode ? 'common.white' : 'text.primary'
                          }
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                </>
              )}
            </List>
          )}
        </Box>
      </Drawer>
    </>
  );
};

export default NavigationDrawer;
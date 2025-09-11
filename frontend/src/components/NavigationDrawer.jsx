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
  IconButton
} from '@mui/material';
import {
  Menu as MenuIcon,
  History as HistoryIcon,
  Upload as UploadIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  ArrowBack as ArrowBackIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { PERMISSIONS } from '../constants/auth';

const NavigationDrawer = ({ 
  open, 
  onClose, 
  onMenuSelect, 
  onBack, 
  darkMode,
  menuItems = []
}) => {
  const { hasPermission } = useAuth();

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
      id: 'usuarios',
      label: 'Usuarios',
      icon: <PeopleIcon />,
      permission: PERMISSIONS.ADMIN_PANEL
    }
  ];

  const items = menuItems.length > 0 ? menuItems : defaultMenuItems;

  const handleMenuItemClick = (itemId) => {
    if (onMenuSelect) {
      onMenuSelect(itemId);
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
          
          <List sx={{ p: 0 }}>
            {items.map((item) => {
              const isDisabled = item.permission && !hasPermission(item.permission);
              
              return (
                <ListItem key={item.id} disablePadding sx={{ mb: 1 }}>
                  <ListItemButton
                    onClick={() => handleMenuItemClick(item.id)}
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
                      primary="Volver"
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
        </Box>
      </Drawer>
    </>
  );
};

export default NavigationDrawer;
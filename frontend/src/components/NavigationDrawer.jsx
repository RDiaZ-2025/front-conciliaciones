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
  CircularProgress,
  Card,
  CardContent,
  CardActionArea,
  Stack,
  Chip
} from '@mui/material';
import {
  Menu as MenuIcon,
  History as HistoryIcon,
  CloudUpload as CloudUploadIcon,
  Analytics as AnalyticsIcon,
  SupervisorAccount as SupervisorAccountIcon,
  ArrowBack as ArrowBackIcon,
  Close as CloseIcon,
  Factory as FactoryIcon,
  Lock as LockIcon
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
  const getPermissionForMenuItem = (itemId) => {
    const permissionMap = {
      'historial': PERMISSIONS.HISTORY_LOAD_COMMERCIAL_FILES,
      'upload': PERMISSIONS.DOCUMENT_UPLOAD,
      'dashboard': PERMISSIONS.MANAGEMENT_DASHBOARD,
      'production': PERMISSIONS.PRODUCTION_MANAGEMENT,
      'usuarios': PERMISSIONS.ADMIN_PANEL
    };
    return permissionMap[itemId];
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
      icon: <CloudUploadIcon />,
      permission: PERMISSIONS.DOCUMENT_UPLOAD
    },
    {
      id: 'dashboard',
      label: 'Dashboard de Gestión',
      icon: <AnalyticsIcon />,
      permission: PERMISSIONS.MANAGEMENT_DASHBOARD
    },
    {
      id: 'production',
      label: 'Producción',
      icon: <FactoryIcon />,
      permission: PERMISSIONS.PRODUCTION_MANAGEMENT
    },
    {
      id: 'usuarios',
      label: 'Usuarios',
      icon: <SupervisorAccountIcon />,
      permission: PERMISSIONS.ADMIN_PANEL
    }
  ];

  // Use database menu items if available, otherwise fall back to default
  const items = dbMenuItems && dbMenuItems.length > 0 ? dbMenuItems.map(item => {
    // Map icon names to actual icon components
    const iconMap = {
      'HistoryIcon': HistoryIcon,
      'CloudUploadIcon': CloudUploadIcon,
      'AnalyticsIcon': AnalyticsIcon,
      'SupervisorAccountIcon': SupervisorAccountIcon,
      'FactoryIcon': FactoryIcon
    };
    
    const IconComponent = iconMap[item.icon] || FactoryIcon;
    
    return {
      ...item,
      icon: <IconComponent />,
      permission: getPermissionForMenuItem(item.id) // Add permission mapping
    };
  }) : defaultMenuItems;



  // Debug logging
  console.log('NavigationDrawer - Database items:', dbMenuItems);
  console.log('NavigationDrawer - Final items:', items);
  console.log('NavigationDrawer - Loading:', loading);
  console.log('NavigationDrawer - Error:', error);

  const handleMenuItemClick = (item) => {
    console.log('NavigationDrawer - Menu item clicked:', item);
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
            width: { xs: '100vw', sm: 320, md: 360 },
            maxWidth: { xs: '100vw', sm: '90vw', md: 400 },
            bgcolor: 'background.paper',
            color: 'text.primary',
            borderRight: theme => `1px solid ${theme.palette.divider}`
          }
        }}
      >

        <Box sx={{ p: { xs: 1, sm: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 'bold',
                color: 'text.primary'
              }}
            >
              Menú de Navegación
            </Typography>
            <IconButton 
              onClick={onClose}
              size="small"
              sx={{ color: 'text.primary' }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
          
          <Divider sx={{ mb: 2 }} />
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : error ? (
            <Box sx={{ p: 2 }}>
              <Typography variant="body2" color="error" component="div">
                Error cargando menús: {error}
              </Typography>
            </Box>
          ) : (
            <Stack spacing={2} sx={{ p: 0 }}>
              {items
                .map((item) => {
                  // Check if user has permission for this item
                  const hasRequiredPermission = !item.permission || hasPermission(item.permission);
                  
                  // Debug logging for filtering
                  console.log(`Menu item ${item.id} (${item.label}):`, {
                    permission: item.permission,
                    hasPermission: item.permission ? hasPermission(item.permission) : 'no permission required',
                    willShow: true,
                    isRestricted: !hasRequiredPermission,
                    hasRequiredPermission
                  });
                  
                  return (
                    <Card 
                      key={item.id}
                      elevation={hasRequiredPermission ? 2 : 1}
                      sx={{
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        opacity: hasRequiredPermission ? 1 : 0.3,
                        filter: hasRequiredPermission ? 'none' : 'grayscale(1)',
                        backgroundColor: hasRequiredPermission ? 'background.paper' : 'grey.100',
                        '&:hover': hasRequiredPermission ? {
                          elevation: 4,
                          transform: 'translateY(-2px)',
                          boxShadow: theme => theme.shadows[8]
                        } : {}
                      }}
                    >
                      <CardActionArea
                        onClick={hasRequiredPermission ? () => handleMenuItemClick(item) : undefined}
                        disabled={!hasRequiredPermission}
                        sx={{
                          p: { xs: 1.5, sm: 2 },
                          borderRadius: 1,
                          cursor: hasRequiredPermission ? 'pointer' : 'not-allowed',
                          '&:hover': hasRequiredPermission ? {
                            bgcolor: 'action.hover'
                          } : {},
                          '&.Mui-disabled': {
                            opacity: 1, // We handle opacity at Card level
                            backgroundColor: 'transparent'
                          }
                        }}
                      >
                        <Stack direction="row" spacing={{ xs: 1.5, sm: 2 }} alignItems="center">
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              p: { xs: 1, sm: 1.5 },
                              minWidth: { xs: 40, sm: 48 },
                              minHeight: { xs: 40, sm: 48 },
                              borderRadius: 2,
                              bgcolor: hasRequiredPermission ? 'primary.main' : 'grey.400',
                              color: hasRequiredPermission ? 'primary.contrastText' : 'grey.600',
                              transition: 'all 0.2s ease-in-out'
                            }}
                          >
                            {hasRequiredPermission ? item.icon : <LockIcon />}
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              variant="body1"
                              sx={{
                                fontWeight: 'medium',
                                color: hasRequiredPermission ? 'text.primary' : 'text.disabled',
                                fontSize: { xs: '0.9rem', sm: '1rem' },
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {item.label}
                            </Typography>
                            {!hasRequiredPermission && (
                              <Chip
                                icon={<LockIcon />}
                                label="Sin permisos"
                                size="small"
                                variant="outlined"
                                sx={{
                                  mt: 0.5,
                                  height: 20,
                                  fontSize: '0.7rem',
                                  color: 'error.main',
                                  borderColor: 'error.main',
                                  backgroundColor: 'error.light',
                                  '& .MuiChip-icon': {
                                    fontSize: '0.8rem',
                                    color: 'error.main'
                                  }
                                }}
                              />
                            )}
                          </Box>
                        </Stack>
                      </CardActionArea>
                    </Card>
                  );
                })}
             
             {onBack && (
               <>
                 <Divider sx={{ my: 2 }} />
                 <Card elevation={1}>
                   <CardActionArea
                      onClick={handleBackClick}
                      sx={{ p: { xs: 1.5, sm: 2 } }}
                    >
                     <Stack direction="row" alignItems="center" spacing={{ xs: 1.5, sm: 2 }}>
                       <Box
                         sx={{
                           p: 1,
                           borderRadius: '50%',
                           bgcolor: 'primary.main',
                           color: 'common.white',
                           display: 'flex',
                           alignItems: 'center',
                           justifyContent: 'center',
                           minWidth: 40,
                           minHeight: 40
                         }}
                       >
                         <ArrowBackIcon />
                       </Box>
                       <Typography
                         variant="subtitle1"
                         sx={{
                           fontWeight: 500,
                           color: 'text.primary'
                         }}
                       >
                         Volver
                       </Typography>
                     </Stack>
                   </CardActionArea>
                 </Card>
               </>
             )}
           </Stack>
           )}
        </Box>
      </Drawer>
    </>
  );
};

export default NavigationDrawer;
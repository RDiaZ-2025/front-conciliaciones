import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Lock as LockIcon, Home as HomeIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const UnauthorizedAccess = ({ darkMode, onBackToHome }) => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: darkMode ? '#181C32' : '#f8fafc',
        padding: 2
      }}
    >
      <Paper
        elevation={6}
        sx={{
          p: 4,
          borderRadius: 4,
          maxWidth: 400,
          width: '100%',
          textAlign: 'center',
          background: darkMode ? '#4A5568' : '#fff'
        }}
      >
        <LockIcon
          sx={{
            fontSize: 64,
            color: darkMode ? '#E60026' : '#181C32',
            mb: 2
          }}
        />
        <Typography
          variant="h5"
          fontWeight={700}
          color={darkMode ? '#fff' : '#000'}
          mb={2}
        >
          Acceso Denegado
        </Typography>
        <Typography
          variant="body1"
          color={darkMode ? '#CBD5E0' : '#666'}
          mb={3}
        >
          No tienes permisos para acceder a esta sección. 
          Contacta al administrador si necesitas acceso.
        </Typography>
        <Button
          variant="contained"
          startIcon={<HomeIcon />}
          onClick={onBackToHome}
          sx={{
            background: darkMode ? '#E60026' : '#181C32',
            '&:hover': {
              background: darkMode ? '#B8001B' : '#232946'
            },
            borderRadius: 2,
            px: 3,
            py: 1
          }}
        >
          Volver al Inicio
        </Button>
      </Paper>
    </Box>
  );
};

const ProtectedRoute = ({ 
  children, 
  requiredPermission, 
  darkMode = false,
  onUnauthorized 
}) => {
  const { user, hasPermission } = useAuth();

  // Si no hay usuario logueado, no mostrar nada (el App.jsx manejará la redirección)
  if (!user) {
    return null;
  }

  // Verificar permisos
  const hasRequiredPermission = requiredPermission ? hasPermission(requiredPermission) : true;

  if (!hasRequiredPermission) {
    return (
      <UnauthorizedAccess 
        darkMode={darkMode} 
        onBackToHome={onUnauthorized}
      />
    );
  }

  return children;
};

export default ProtectedRoute;
import React from 'react';
import {
  Box,
  Container,
  Avatar
} from '@mui/material';
import NavigationMenu from './NavigationMenu';
import DarkModeToggle from './DarkModeToggle';
import LoadDocumentsOCbyUserView from '../pages/LoadDocumentsOCbyUserView';
import DashboardGeneral from '../pages/DashboardGeneral';
import UploadForm from '../pages/UploadForm';
import AdminPanel from '../pages/AdminPanel';
import logoClaroMedia from '../assets/Claro-Media-Logo.jpg';

const Layout = ({ 
  children, 
  darkMode, 
  setDarkMode, 
  onBack,
  onMenuSelect,
  selectedMenu,
  showNavigation = true,
  showDarkModeToggle = true,
  containerMaxWidth = 'xl',
  fullWidth = false
}) => {
  const renderContent = () => {
    if (children) {
      return children;
    }
    
    switch (selectedMenu) {
      case 'historial':
        return <LoadDocumentsOCbyUserView darkMode={darkMode} />;
      case 'upload':
        return (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: theme => theme.spacing(3) }}>
              <Avatar
                src={logoClaroMedia}
                alt="Claro Media Data Tech"
                sx={{
                  width: theme => theme.spacing(22.5),
                  height: theme => theme.spacing(22.5),
                  borderRadius: 0
                }}
              />
            </Box>
            <UploadForm hideHeader={true} />
          </Box>
        );
      case 'dashboard':
        return <DashboardGeneral />;
      case 'usuarios':
      default:
        return <AdminPanel />;
    }
  };
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        color: 'text.primary',
        position: 'relative',
        transition: theme => theme.transitions.create(['background-color'], {
          duration: theme.transitions.duration.standard,
        })
      }}
    >
      {showNavigation && (
        <NavigationMenu
          onMenuSelect={onMenuSelect}
          onBack={onBack}
          darkMode={darkMode}
        />
      )}
      
      {showDarkModeToggle && (
        <Box
          sx={{
            position: 'absolute',
            top: theme => theme.spacing(3),
            right: theme => theme.spacing(4),
            zIndex: theme => theme.zIndex.appBar,
            display: 'flex',
            alignItems: 'center',
            gap: theme => theme.spacing(2)
          }}
        >
          <DarkModeToggle
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            onLogoClick={onBack}
          />
        </Box>
      )}

      {fullWidth ? (
        <Box sx={{ width: '100%' }}>
          {renderContent()}
        </Box>
      ) : (
        <Container 
          maxWidth={containerMaxWidth}
          sx={{
            py: theme => theme.spacing(4),
            position: 'relative',
            zIndex: 1
          }}
        >
          {renderContent()}
        </Container>
      )}
    </Box>
  );
};

export default Layout;
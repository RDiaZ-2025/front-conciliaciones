import React from 'react';
import {
  Box,
  Container
} from '@mui/material';
import NavigationMenu from './NavigationMenu';
import DarkModeToggle from './DarkModeToggle';

const Layout = ({ 
  children, 
  darkMode, 
  setDarkMode, 
  onBack,
  onMenuSelect,
  showNavigation = true,
  showDarkModeToggle = true,
  containerMaxWidth = 'xl',
  fullWidth = false
}) => {
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
          {children}
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
          {children}
        </Container>
      )}
    </Box>
  );
};

export default Layout;
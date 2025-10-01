import React, { useState } from 'react';
import {
  Box,
  IconButton
} from '@mui/material';
import {
  Menu as MenuIcon
} from '@mui/icons-material';
import NavigationDrawer from './NavigationDrawer';

const NavigationMenu = ({ 
  onMenuSelect, 
  onBack, 
  darkMode,
  menuItems = [],
  position = { top: 24, left: 32 },
  size = "large"
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleDrawerOpen = () => {
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
  };

  return (
    <>
      <Box 
        sx={{ 
          position: 'absolute', 
          top: position.top, 
          left: position.left, 
          zIndex: theme => theme.zIndex.appBar
        }}
      >
        <IconButton 
          onClick={handleDrawerOpen} 
          size={size} 
          title="Abrir menú de navegación"
          sx={{
            color: darkMode ? 'common.white' : 'text.primary',
            bgcolor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)',
            '&:hover': {
              bgcolor: darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.08)'
            },
            transition: theme => theme.transitions.create(['background-color'], {
              duration: theme.transitions.duration.short
            })
          }}
        >
          <MenuIcon />
        </IconButton>
      </Box>
      
      <NavigationDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        onMenuSelect={onMenuSelect}
        onBack={onBack}
        darkMode={darkMode}
        menuItems={menuItems}
      />
    </>
  );
};

export default NavigationMenu;
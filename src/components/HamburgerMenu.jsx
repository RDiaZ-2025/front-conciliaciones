import React, { useState } from 'react';
import { 
  IconButton, 
  Menu, 
  MenuItem, 
  ListItemIcon, 
  ListItemText,
  Box,
  Typography,
  Divider
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';

const HamburgerMenu = ({ darkMode, onCierreVentasClick }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleCierreVentasClick = () => {
    handleClose();
    onCierreVentasClick();
  };

  return (
    <Box>
      <IconButton
        onClick={handleClick}
        sx={{
          color: darkMode ? '#fff' : '#222',
          backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          borderRadius: 2,
          padding: '8px',
          transition: 'all 0.3s ease',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          '&:hover': {
            backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,1)',
            transform: 'translateY(-1px)',
            boxShadow: '0 6px 25px rgba(0,0,0,0.15)',
          }
        }}
      >
        <MenuIcon sx={{ fontSize: 20 }} />
      </IconButton>
      
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'left', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            backgroundColor: darkMode ? '#4A5568' : '#fff',
            color: darkMode ? '#fff' : '#000',
            minWidth: 280,
            maxWidth: 320,
            boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
            borderRadius: 3,
            border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
            backdropFilter: 'blur(20px)',
            mt: 1,
            '& .MuiMenuItem-root': {
              borderRadius: 2,
              margin: '4px 8px',
              transition: 'all 0.2s ease',
            }
          }
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography 
            variant="subtitle2" 
            sx={{ 
              color: darkMode ? '#cbd5e0' : '#64748b',
              fontWeight: 600,
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            Menú Principal
          </Typography>
        </Box>
        
        <Divider sx={{ 
          borderColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
          mx: 1
        }} />
        
        <MenuItem 
          onClick={handleCierreVentasClick}
          sx={{
            py: 1.5,
            px: 2,
            '&:hover': {
              backgroundColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
              transform: 'translateX(4px)',
            }
          }}
        >
          <ListItemIcon 
            sx={{ 
              color: darkMode ? '#81c784' : '#000',
              minWidth: 40,
              '& .MuiSvgIcon-root': {
                fontSize: 22
              }
            }}
          >
            <PointOfSaleIcon />
          </ListItemIcon>
          <ListItemText 
            primary={
              <Typography 
                sx={{ 
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  color: darkMode ? '#fff' : '#1a202c'
                }}
              >
                CIERRE DE VENTAS
              </Typography>
            }
            secondary={
              <Typography 
                sx={{ 
                  fontSize: '0.8rem',
                  color: darkMode ? '#a0aec0' : '#64748b',
                  mt: 0.5
                }}
              >
                Gestión de cierres y periodicidad
              </Typography>
            }
          />
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default HamburgerMenu;
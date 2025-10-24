import React from 'react';
import {
  Box,
  Typography,
  Stack,
  useTheme
} from '@mui/material';

interface PageHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ icon, title, subtitle }) => {
  const theme = useTheme();

  return (
    <Box sx={{ mb: theme.spacing(6), textAlign: 'center' }}>
      <Stack 
        direction={{ xs: 'column', sm: 'row' }} 
        alignItems="center" 
        justifyContent="center" 
        spacing={3} 
        sx={{ mb: 3 }}
      >
        <Box
          sx={{
            p: theme.spacing(1),
            borderRadius: '50%',
            bgcolor: 'primary.main',
            height: 48,
            width: 48,
            boxShadow: theme.shadows[4]
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: theme.typography.fontWeightBold,
              color: 'text.primary',
              letterSpacing: '-0.02em'
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{
              color: 'text.secondary',
              fontWeight: theme.typography.fontWeightRegular,
              mt: 0.5
            }}
          >
            {subtitle}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
};

export default PageHeader;
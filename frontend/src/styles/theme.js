import { createTheme } from '@mui/material/styles';

const createAppTheme = (darkMode) => createTheme({
  palette: {
    mode: darkMode ? 'dark' : 'light',
    primary: {
      main: darkMode ? '#EB111F' : '#EB111F',
      light: darkMode ? '#EB111F' : '#EB111F',
      dark: darkMode ? '#EB111F' : '#EB111F',
    },
    secondary: {
      main: darkMode ? '#EB111F' : '#EB111F',
      light: darkMode ? '#EB111F' : '#EB111F',
      dark: darkMode ? '#EB111F' : '#EB111F',
    },
    background: {
      default: darkMode ? '#151921' : 'linear-gradient(135deg, #e0e7ff 0%, #f8fafc 100%)',
      paper: darkMode ? '#151921' : '#ffffff',
    },
    text: {
      primary: darkMode ? '#ffffff' : '#181C32',
      secondary: darkMode ? '#cbd5e0' : '#64748b',
    },
  },
  typography: {
    fontFamily: 'system-ui, Avenir, Helvetica, Arial, sans-serif',
    h5: {
      fontWeight: 700,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '@global': {
          '@keyframes heartbeat': {
            '0%': { transform: 'scale(1)' },
            '14%': { transform: 'scale(1.15)' },
            '28%': { transform: 'scale(1)' },
            '42%': { transform: 'scale(1.15)' },
            '70%': { transform: 'scale(1)' },
          },
          '.heartbeat': {
            animation: 'heartbeat 1.2s infinite',
          },
          'input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus, input:-webkit-autofill:active': {
            WebkitBoxShadow: darkMode 
              ? '0 0 0 30px #4A5568 inset !important'
              : '0 0 0 30px white inset !important',
            WebkitTextFillColor: darkMode ? '#fff !important' : '#181C32 !important',
            backgroundColor: darkMode ? '#4A5568 !important' : 'white !important',
            background: darkMode ? '#4A5568 !important' : 'white !important',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: darkMode ? '#232946' : '#f8fafc',
            borderRadius: 8,
            '& fieldset': {
              borderColor: darkMode ? '#fff' : '#000',
            },
            '&:hover fieldset': {
              borderColor: darkMode ? '#fff' : '#222',
            },
            '&.Mui-focused fieldset': {
              borderColor: darkMode ? '#fff' : '#000',
            },
            '& input': {
              color: darkMode ? '#fff' : '#181C32',
            },
          },
          '& .MuiInputLabel-root': {
            color: darkMode ? '#fff' : '#000',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        contained: {
          fontWeight: 600,
          fontSize: 18,
          paddingTop: 12,
          paddingBottom: 12,
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
          '&:hover': {
            backgroundColor: darkMode ? '#B8001B' : '#232946',
          },
        },
      },
    },
  },
});

export default createAppTheme;
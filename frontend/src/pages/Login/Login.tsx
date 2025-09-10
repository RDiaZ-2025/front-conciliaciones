import React from "react";
import { Box, Button, TextField, Paper, Typography, InputAdornment, IconButton, CircularProgress } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import claroMediaLogo from "../../assets/Claro-Media-Logo.jpg";
import DarkModeToggle from "../../components/DarkModeToggle";
import { Global } from '@emotion/react';
import { useLogin } from './useLogin';
import type { LoginProps } from './types';

function HeartbeatGlobalStyle() {
  return (
    <Global
      styles={`
        @keyframes heartbeat {
          0% { transform: scale(1); }
          14% { transform: scale(1.15); }
          28% { transform: scale(1); }
          42% { transform: scale(1.15); }
          70% { transform: scale(1); }
        }
        
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px white inset !important;
          -webkit-text-fill-color: #181C32 !important;
          background-color: white !important;
          background: white !important;
        }
        
        .dark-mode input:-webkit-autofill,
        .dark-mode input:-webkit-autofill:hover,
        .dark-mode input:-webkit-autofill:focus,
        .dark-mode input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px #4A5568 inset !important;
          -webkit-text-fill-color: #fff !important;
          background-color: #4A5568 !important;
          background: #4A5568 !important;
        }
      `}
    />
  );
}

const Login: React.FC<LoginProps> = ({ onLogin, darkMode, setDarkMode }) => {
  const {
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    error,
    loading,
    handleSubmit
  } = useLogin(onLogin);

  return (
    <Box
      className={darkMode ? "dark-mode" : ""}
      sx={{
        minHeight: "100vh",
        minWidth: "100vw",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        background: darkMode ? "#2D3748" : "linear-gradient(135deg, #e0e7ff 0%, #f8fafc 100%)",
        color: darkMode ? "#fff" : "#181C32",
        position: "fixed",
        inset: 0,
        transition: "background 0.3s, color 0.3s"
      }}
    >
      <HeartbeatGlobalStyle />
      
      <Box sx={{ width: "100%", position: "relative", mt: 5, mb: 2, px: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <img
            src={claroMediaLogo}
            alt="Claro Media Logo"
            style={{ width: 180 }}
          />
        </Box>
        
        <Box sx={{ position: "absolute", right: 40, top: "50%", transform: "translateY(-50%)", zIndex: 1000 }}>
          <DarkModeToggle 
            darkMode={darkMode} 
            setDarkMode={setDarkMode} 
            onLogoClick={() => {}}
            hideLogo={true}
          />
        </Box>
      </Box>
      
      <Paper 
        elevation={6} 
        sx={{ 
          p: 5, 
          borderRadius: 4, 
          minWidth: 340, 
          maxWidth: 380, 
          width: "100%", 
          boxShadow: "0 8px 32px rgba(25, 118, 210, 0.10)", 
          background: darkMode ? "#4A5568" : "#fff" 
        }}
      >
        <Typography 
          variant="h5" 
          fontWeight={700} 
          color={darkMode ? "#fff" : "#000000"} 
          align="center" 
          mb={2}
        >
          Iniciar sesión
        </Typography>
        
        <form onSubmit={handleSubmit}>
          <TextField
            label="Correo electrónico"
            type="email"
            fullWidth
            margin="normal"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            sx={{ 
              background: darkMode ? "#232946" : "#f8fafc", 
              borderRadius: 2, 
              '& .MuiOutlinedInput-root': { 
                '& fieldset': { borderColor: darkMode ? '#fff' : '#000' }, 
                '&:hover fieldset': { borderColor: darkMode ? '#fff' : '#222' }, 
                '&.Mui-focused fieldset': { borderColor: darkMode ? '#fff' : '#000' }, 
                '& input': { color: darkMode ? '#fff' : '#181C32' } 
              } 
            }}
            InputLabelProps={{ style: { color: darkMode ? '#fff' : '#000' } }}
          />
          
          <TextField
            label="Contraseña"
            type={showPassword ? "text" : "password"}
            fullWidth
            margin="normal"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            sx={{ 
              background: darkMode ? "#232946" : "#f8fafc", 
              borderRadius: 2, 
              '& .MuiOutlinedInput-root': { 
                '& fieldset': { borderColor: darkMode ? '#fff' : '#000' }, 
                '&:hover fieldset': { borderColor: darkMode ? '#fff' : '#222' }, 
                '&.Mui-focused fieldset': { borderColor: darkMode ? '#fff' : '#000' }, 
                '& input': { color: darkMode ? '#fff' : '#181C32' } 
              } 
            }}
            InputLabelProps={{ style: { color: darkMode ? '#fff' : '#000' } }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton 
                    onClick={() => setShowPassword(v => !v)} 
                    edge="end" 
                    style={{ color: darkMode ? '#fff' : '#000' }}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          
          {error && (
            <Typography color="error" fontSize={15} mt={1}>
              {error}
            </Typography>
          )}
          
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              sx={{ 
                mt: 3, 
                fontWeight: 600, 
                fontSize: 18, 
                py: 1.5, 
                borderRadius: 3, 
                boxShadow: '0 2px 8px rgba(0,0,0,0.10)', 
                background: darkMode ? '#E60026' : '#181C32', 
                '&:hover': { background: darkMode ? '#B8001B' : '#232946' } 
              }}
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={28} color="inherit" />
              ) : (
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>
                  Ingresar!
                </span>
              )}
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default Login;
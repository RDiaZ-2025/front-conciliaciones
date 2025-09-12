import React from "react";
import { 
  Box, 
  Button, 
  TextField, 
  Paper, 
  Typography, 
  InputAdornment, 
  IconButton, 
  CircularProgress,
  Container,
  Stack,
  Alert,
  FormControl,
  Avatar
} from "@mui/material";
import { Visibility, VisibilityOff, Email, Lock } from "@mui/icons-material";
import claroMediaLogo from "../../assets/Claro-Media-Logo.jpg";
import DarkModeToggle from "../../components/DarkModeToggle";
import { useLogin } from './useLogin';
import type { LoginProps } from './types';



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
      sx={{
        minHeight: "100vh",
        bgcolor: 'background.default',
        color: 'text.primary',
        display: "flex",
        flexDirection: "column",
        transition: theme => theme.transitions.create(['background-color', 'color'], {
          duration: theme.transitions.duration.standard,
        })
      }}
    >
      <Container
        maxWidth="sm"
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          py: theme => theme.spacing(3)
        }}
      >
        <Box sx={{ position: "absolute", top: theme => theme.spacing(2), right: theme => theme.spacing(2), zIndex: theme => theme.zIndex.modal }}>
          <DarkModeToggle 
            darkMode={darkMode} 
            setDarkMode={setDarkMode} 
            onLogoClick={() => {}}
            hideLogo={true}
          />
        </Box>

        <Stack spacing={3} alignItems="center" sx={{ width: "100%" }}>
          <Avatar
            src={claroMediaLogo}
            alt="Claro Media Logo"
            className="heartbeat"
            sx={{
              width: theme => theme.spacing(32.5),
              height: theme => theme.spacing(15),
              borderRadius: 0
            }}
          />
          <Paper 
            elevation={8} 
            sx={{ 
              p: theme => theme.spacing(4), 
              borderRadius: theme => theme.spacing(2), 
              width: "100%",
              maxWidth: theme => theme.spacing(50),
              bgcolor: 'background.paper'
            }}
          >
            <Typography 
              variant="h4" 
              component="h1"
              sx={{
                fontWeight: theme => theme.typography.fontWeightRegular,
                color: 'text.primary',
                textAlign: 'center',
                mb: theme => theme.spacing(2)
              }}
            >
              Iniciar sesión
            </Typography>

            <Typography  
              component="h3"
              sx={{
                fontWeight: theme => theme.typography.fontWeightLight,
                color: 'text.primary',
                textAlign: 'center',
                mb: theme => theme.spacing(3)
              }}
            >
              Bienvenido a Claro Media
            </Typography>
            
            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Stack spacing={3}>
                <FormControl fullWidth>
                  <TextField
                    label="Correo electrónico"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Email color="action" />
                        </InputAdornment>
                      )
                    }}
                  />
                </FormControl>
                
                <FormControl fullWidth>
                  <TextField
                    label="Contraseña"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton 
                            onClick={() => setShowPassword(v => !v)} 
                            edge="end"
                            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />
                </FormControl>
                
                {error && (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    {error}
                  </Alert>
                )}
                
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="large"
                  fullWidth
                  disabled={loading}
                  sx={{
                    mt: theme => theme.spacing(2),
                    py: theme => theme.spacing(1.5)
                  }}
                >
                  {loading ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CircularProgress size={20} color="inherit" />
                      <Typography variant="button">Ingresando...</Typography>
                    </Stack>
                  ) : (
                    "Ingresar"
                  )}
                </Button>
              </Stack>
            </Box>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
};

export default Login;
import React, { useState } from "react";
import { Box, Button, TextField, Paper, Typography, InputAdornment, IconButton, CircularProgress } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import claroMediaLogo from "../assets/Claro-Media-Logo.jpg";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import loginIcon from '../assets/CLARO_MEDIA_2_converted.jpg';
import { Global } from '@emotion/react';

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
      `}
    />
  );
}

const Login = ({ onLogin, onBack }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Por favor, ingresa correo y contraseña.");
      return;
    }
    setError("");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLogin();
    }, 1200);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        minWidth: "100vw",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        background: "linear-gradient(135deg, #e0e7ff 0%, #f8fafc 100%)",
        position: "fixed",
        inset: 0,
      }}
    >
      <HeartbeatGlobalStyle />
      <Box sx={{ width: "100%", display: "flex", alignItems: "center", mt: 2, mb: 2, position: "relative" }}>
        <IconButton
          aria-label="Volver"
          onClick={onBack}
          sx={{ position: "absolute", left: 16, top: 0, color: '#000' }}
        >
          <ArrowBackIcon fontSize="large" />
        </IconButton>
        <img
          src={claroMediaLogo}
          alt="Claro Media Logo"
          style={{ width: 180, margin: "0 auto", display: "block" }}
        />
      </Box>
      <Paper elevation={6} sx={{ p: 5, borderRadius: 4, minWidth: 340, maxWidth: 380, width: "100%", boxShadow: "0 8px 32px rgba(0,0,0,0.10)" }}>
        <Typography variant="h5" fontWeight={700} color="#000000" align="center" mb={2}>
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
            sx={{ background: "#f8fafc", borderRadius: 2, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#000' }, '&:hover fieldset': { borderColor: '#222' }, '&.Mui-focused fieldset': { borderColor: '#000' } } }}
            InputLabelProps={{ style: { color: '#000' } }}
          />
          <TextField
            label="Contraseña"
            type={showPassword ? "text" : "password"}
            fullWidth
            margin="normal"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            sx={{ background: "#f8fafc", borderRadius: 2, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#000' }, '&:hover fieldset': { borderColor: '#222' }, '&.Mui-focused fieldset': { borderColor: '#000' } } }}
            InputLabelProps={{ style: { color: '#000' } }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(v => !v)} edge="end">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          {error && <Typography color="error" fontSize={15} mt={1}>{error}</Typography>}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 3, fontWeight: 600, fontSize: 18, py: 1.5, borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.10)', background: '#000', '&:hover': { background: '#222' } }}
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={28} color="inherit" />
              ) : (
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Ingresar!</span>
              )}
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default Login;

// Agrega los keyframes para la animación heartbeat
// <style>
// {`
// @keyframes heartbeat {
//   0% { transform: scale(1); }
//   14% { transform: scale(1.15); }
//   28% { transform: scale(1); }
//   42% { transform: scale(1.15); }
//   70% { transform: scale(1); }
// }
// `}
// </style>
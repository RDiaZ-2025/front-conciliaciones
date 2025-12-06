import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Container, 
  Alert, 
  CircularProgress, 
  Card, 
  CardMedia, 
  CardContent,
  CardActions,
  Stack
} from '@mui/material';
import { CloudUpload as CloudUploadIcon, Delete as DeleteIcon, Image as ImageIcon } from '@mui/icons-material';
import { usePortada15Minutos } from './usePortada15Minutos';

const Portada15Minutos: React.FC = () => {
  const { state, handleFileSelect, handleUpload, handleClear } = usePortada15Minutos();

  return (
    <Box
      sx={{
        bgcolor: 'background.default',
        color: 'text.primary',
        minHeight: '100vh',
        mt: 8,
        py: 4
      }}
    >
      <Container maxWidth="md">
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', mb: 4 }}>
            Portada 15 Minutos
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
            Sube una imagen para la sección "15 Minutos". La imagen se guardará como "portrait.png" y reemplazará cualquier imagen existente.
          </Typography>

          {state.error && (
            <Alert severity="error" sx={{ width: '100%', mb: 3 }}>
              {state.error}
            </Alert>
          )}

          {state.success && (
            <Alert severity="success" sx={{ width: '100%', mb: 3 }}>
              {state.message}
            </Alert>
          )}

          <Box 
            sx={{ 
              width: '100%', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              gap: 3
            }}
          >
            {!state.previewUrl ? (
              <Button
                variant="outlined"
                component="label"
                fullWidth
                sx={{ 
                  height: 200, 
                  borderStyle: 'dashed', 
                  borderWidth: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1
                }}
              >
                <ImageIcon sx={{ fontSize: 60, color: 'action.active' }} />
                <Typography variant="h6" color="text.secondary">
                  Seleccionar Imagen
                </Typography>
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleFileSelect}
                />
              </Button>
            ) : (
              <Card sx={{ width: '100%', maxWidth: 500, boxShadow: 3 }}>
                <CardMedia
                  component="img"
                  image={state.previewUrl}
                  alt="Vista previa"
                  sx={{ maxHeight: 400, objectFit: 'contain', bgcolor: '#f5f5f5' }}
                />
                <CardContent>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {state.selectedFile?.name}
                  </Typography>
                  <Typography variant="caption" display="block" color="text.secondary">
                    {(state.selectedFile?.size || 0) / 1024 > 1024 
                      ? `${((state.selectedFile?.size || 0) / 1024 / 1024).toFixed(2)} MB` 
                      : `${((state.selectedFile?.size || 0) / 1024).toFixed(2)} KB`}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
                  <Button 
                    startIcon={<DeleteIcon />} 
                    color="error" 
                    onClick={handleClear}
                    disabled={state.uploading}
                  >
                    Eliminar
                  </Button>
                </CardActions>
              </Card>
            )}

            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={state.uploading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
              onClick={handleUpload}
              disabled={!state.selectedFile || state.uploading}
              sx={{ minWidth: 200, mt: 2 }}
            >
              {state.uploading ? 'Subiendo...' : 'Subir Imagen'}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Portada15Minutos;

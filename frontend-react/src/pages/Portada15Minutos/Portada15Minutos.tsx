import React, { useState } from 'react';
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
  Grid,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  IconButton,
  Tooltip,
  Snackbar
} from '@mui/material';
import { CloudUpload as CloudUploadIcon, Delete as DeleteIcon, Image as ImageIcon, Info as InfoIcon, ContentCopy as ContentCopyIcon } from '@mui/icons-material';
import { usePortada15Minutos } from './usePortada15Minutos';

const Portada15Minutos: React.FC = () => {
  const { state, currentImageUrl, history, handleFileSelect, handleUpload, handleClear } = usePortada15Minutos();
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentImageUrl);
    setCopySuccess(true);
  };

  const handleCloseSnackbar = () => {
    setCopySuccess(false);
  };

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
      <Container maxWidth="xl">
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', mb: 4, textAlign: 'center' }}>
          Portada 15 Minutos
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
          Gestiona la imagen de portada para la sección "15 Minutos".
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

        <Grid container spacing={4} sx={{ mb: 6 }}>
          {/* Left Column: Current Image */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={3}
              sx={{
                p: 4,
                borderRadius: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                height: '100%'
              }}
            >
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
                Imagen Actual
              </Typography>
              <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1, flexDirection: 'column' }}>
                <Card sx={{ width: '100%', boxShadow: 3, mb: 2 }}>
                  <CardMedia
                    component="img"
                    image={currentImageUrl}
                    alt="Portada actual"
                    sx={{ maxHeight: 400, objectFit: 'contain', bgcolor: '#f5f5f5' }}
                    onError={(e: any) => {
                      e.target.onerror = null;
                      e.target.src = 'https://via.placeholder.com/400x300?text=No+Image+Found';
                    }}
                  />
                </Card>
                <Button
                  variant="outlined"
                  startIcon={<ContentCopyIcon />}
                  onClick={handleCopyLink}
                  size="small"
                >
                  Copiar Enlace
                </Button>
              </Box>
            </Paper>
          </Grid>

          {/* Right Column: Uploader */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={3}
              sx={{
                p: 4,
                borderRadius: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                height: '100%'
              }}
            >
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
                Subir Nueva Imagen
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
                Sube una nueva imagen para reemplazar la actual. Se guardará una copia en el historial y se actualizará la portada principal.
              </Typography>

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
                  <Card sx={{ width: '100%', boxShadow: 3 }}>
                    <CardMedia
                      component="img"
                      image={state.previewUrl}
                      alt="Vista previa"
                      sx={{ maxHeight: 300, objectFit: 'contain', bgcolor: '#f5f5f5' }}
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
          </Grid>
        </Grid>

        {/* History Grid */}
        <Box sx={{ mt: 6 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
            Historial de Portadas
          </Typography>

          {history.length > 0 ? (
            <ImageList sx={{ width: '100%' }} cols={4} gap={16} rowHeight={200}>
              {history.map((item) => (
                <ImageListItem key={item.id}>
                  <img
                    src={item.url}
                    alt={`Portada subida por ${item.uploaderLog}`}
                    loading="lazy"
                    style={{ height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                  />
                  <ImageListItemBar
                    title={new Date(item.timestamp).toLocaleString()}
                    subtitle={item.uploaderLog}
                    actionIcon={
                      <Tooltip title={`Subido por: ${item.uploaderLog}`}>
                        <IconButton
                          sx={{ color: 'rgba(255, 255, 255, 0.54)' }}
                          aria-label={`info about ${item.uploaderLog}`}
                        >
                          <InfoIcon />
                        </IconButton>
                      </Tooltip>
                    }
                  />
                </ImageListItem>
              ))}
            </ImageList>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'background.paper', borderRadius: 2 }}>
              <Typography variant="body1" color="text.secondary">
                No hay historial disponible.
              </Typography>
            </Paper>
          )}
        </Box>

        <Snackbar
          open={copySuccess}
          autoHideDuration={3000}
          onClose={handleCloseSnackbar}
          message="Enlace copiado al portapapeles"
        />
      </Container>
    </Box>
  );
};

export default Portada15Minutos;
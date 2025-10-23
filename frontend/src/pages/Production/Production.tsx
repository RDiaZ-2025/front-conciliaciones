import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Stack,
  Snackbar,
  Alert,
  LinearProgress,
  useTheme
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowForward as ArrowForwardIcon,
  Assignment as AssignmentIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Notes as NotesIcon,
  Download as DownloadIcon,
  Attachment as AttachmentIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { useProduction } from './useProduction';
import { ProductionRequest, ProductionProps, UploadedFile } from './types';
import { useAuth } from '../../contexts/AuthContext';
import FileUpload from '../../components/FileUpload';
import FilePreview from '../../components/FilePreview';

const workflowStages = [
  { id: 'request', label: 'Solicitud' },
  { id: 'quotation', label: 'Cotización' },
  { id: 'material_adjustment', label: 'Ajuste de Material' },
  { id: 'pre_production', label: 'Pre-producción' },
  { id: 'in_production', label: 'En producción' },
  { id: 'in_editing', label: 'En edición' },
  { id: 'delivered_approval', label: 'Entregado para aprobación' },
  { id: 'client_approved', label: 'Aprobado por cliente' },
  { id: 'completed', label: 'Completado y entregado' }
];

// Consistent date formatter: displays the same date as in the dialog.
function formatDateDisplay(dateLike?: string | Date): string {
  if (!dateLike) return 'No definida';
  try {
    const date = typeof dateLike === 'string' ? new Date(dateLike) : dateLike;
    if (isNaN(date.getTime())) {
      // Handle plain YYYY-MM-DD strings without timezone
      if (typeof dateLike === 'string') {
        const m = dateLike.match(/^\d{4}-\d{2}-\d{2}$/);
        if (m) {
          const [y, mo, d] = dateLike.split('-');
          return `${d}/${mo}/${y}`;
        }
      }
      return '';
    }
    // Force UTC to avoid timezone shifts between card and dialog
    return date.toLocaleDateString(undefined, { timeZone: 'UTC' });
  } catch {
    return '';
  }
}

const Production: React.FC<ProductionProps> = ({ darkMode }) => {
  const theme = useTheme();
  const { user } = useAuth();
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  const {
    productionRequests,
    loading,
    error,
    openDialog,
    formData,
    setFormData,
    snackbar,
    setSnackbar,
    handleOpenDialog,
    handleCloseDialog,
    handleInputChange,
    handleSelectChange,
    handleSubmit,
    handleMoveRequest,
    handleDeleteRequest,
    handleCloseSnackbar,
    fetchProductionRequests,
    uploadedFiles,
    uploadProgress,
    isUploading,
    handleFileUpload,
    uploadFilesToAzure,
    downloadFilesFromAzure,
    downloadSingleFile,
    getFileForPreview
  } = useProduction();

  const handleFileDownload = (file: UploadedFile) => {
    if (file.id) {
      downloadSingleFile(file.id, file.name);
    }
  };

  const handleFilePreview = async (file: UploadedFile) => {
    try {
      const fileObject = await getFileForPreview(file);
      if (fileObject) {
        setPreviewFile(fileObject);
        setIsPreviewOpen(true);
      } else {
        setSnackbar({
          open: true,
          message: 'No se pudo preparar el archivo para previsualización',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error loading file for preview:', error);
      setSnackbar({
        open: true,
        message: 'Error al cargar el archivo para previsualización',
        severity: 'error'
      });
    }
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    setPreviewFile(null);
  };

  const handlePreviewDownload = (file: File) => {
    try {
      // Validate that file is a proper File object
      if (!file || !(file instanceof File) || !file.name) {
        console.error('Invalid file object for download:', file);
        setSnackbar({
          open: true,
          message: 'Error: Archivo inválido para descarga',
          severity: 'error'
        });
        return;
      }

      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error creating object URL for download:', error);
      setSnackbar({
        open: true,
        message: 'Error al descargar el archivo',
        severity: 'error'
      });
    }
  };

  const renderRequestCard = (request: ProductionRequest) => (
    <Card 
      key={request.id} 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '16px', // Soft rounded corners as per design guidelines
        boxShadow: theme.shadows[2],
        bgcolor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        overflow: 'visible', // Prevent content clipping
        '&:hover': {
          boxShadow: theme.shadows[8],
          transform: 'translateY(-2px)',
          borderColor: theme.palette.primary.light,
        },
        transition: theme.transitions.create(['box-shadow', 'transform', 'border-color'], {
          duration: theme.transitions.duration.standard
        })
      }}
    >
      <CardContent sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        p: 3, // Consistent internal padding
        pb: 1 // Reduced bottom padding to accommodate actions
      }}>
        {/* Header with title and status */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start', 
          mb: 3,
          gap: 2
        }}>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: theme.typography.fontWeightBold,
              color: 'text.primary',
              flex: 1,
              lineHeight: 1.3,
              // Remove text truncation to prevent clipping
              wordBreak: 'break-word'
            }}
          >
            {request.name}
          </Typography>
          <Chip 
            label={workflowStages.find(stage => stage.id === request.stage)?.label || 'Desconocido'}
            sx={{
              fontWeight: 'medium',
              bgcolor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              borderRadius: '8px',
              flexShrink: 0,
              fontSize: '0.75rem',
              height: '24px',
              '&:hover': {
                bgcolor: theme.palette.primary.dark,
              }
            }}
            size="small"
          />
        </Box>
        
        {/* Content section with proper spacing */}
        <Stack spacing={2.5} sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <CalendarIcon 
              fontSize="small" 
              sx={{ 
                color: 'text.secondary',
                flexShrink: 0
              }} 
            />
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ 
                fontSize: '0.875rem',
                lineHeight: 1.4,
                display: 'block'
              }}
            >
              <Box component="span" sx={{ fontWeight: 'medium', color: 'text.primary' }}>
                Fecha de solicitud:
              </Box>{' '}
              {/* changed */}
              {formatDateDisplay(request.requestDate as unknown as string)}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <PersonIcon 
              fontSize="small" 
              sx={{ 
                color: 'text.secondary',
                flexShrink: 0
              }} 
            />
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ 
                fontSize: '0.875rem',
                lineHeight: 1.4,
                display: 'block'
              }}
            >
              <Box component="span" sx={{ fontWeight: 'medium', color: 'text.primary' }}>
                Departamento:
              </Box>{' '}
              {request.department}
              <br />
              <Box component="span" sx={{ fontWeight: 'medium', color: 'text.primary' }}>
                Contacto:
              </Box>{' '}
              {request.contactPerson}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <GroupIcon 
              fontSize="small" 
              sx={{ 
                color: 'text.secondary',
                flexShrink: 0
              }} 
            />
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ 
                fontSize: '0.875rem',
                lineHeight: 1.4,
                display: 'block'
              }}
            >
              <Box component="span" sx={{ fontWeight: 'medium', color: 'text.primary' }}>
                Equipo asignado:
              </Box>{' '}
              {request.assignedTeam}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <CalendarIcon 
              fontSize="small" 
              sx={{ 
                color: 'text.secondary',
                flexShrink: 0
              }} 
            />
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ 
                fontSize: '0.875rem',
                lineHeight: 1.4,
                display: 'block'
              }}
            >
              <Box component="span" sx={{ fontWeight: 'medium', color: 'text.primary' }}>
                Fecha de entrega:
              </Box>{' '}
              {/* changed */}
              {formatDateDisplay(request.deliveryDate as unknown as string)}
            </Typography>
          </Box>
          
          {request.observations && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: 1.5,
              mt: 1
            }}>
              <NotesIcon 
                fontSize="small" 
                sx={{ 
                  color: 'text.secondary',
                  flexShrink: 0,
                  mt: 0.2
                }} 
              />
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ 
                  fontSize: '0.875rem',
                  lineHeight: 1.4,
                  display: 'block'
                }}
              >
                <Box component="span" sx={{ fontWeight: 'medium', color: 'text.primary' }}>
                  Observaciones:
                </Box>{' '}
                {request.observations}
              </Typography>
            </Box>
          )}
          
          {/* Files section */}
          {request.files && request.files.length > 0 && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: 1.5,
              mt: 1
            }}>
              <AttachmentIcon 
                fontSize="small" 
                sx={{ 
                  color: 'text.secondary',
                  flexShrink: 0,
                  mt: 0.2
                }} 
              />
              <Box sx={{ flex: 1 }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 'medium', 
                    color: 'text.primary',
                    fontSize: '0.875rem',
                    mb: 1
                  }}
                >
                  Archivos adjuntos ({request.files.length}):
                </Typography>
                <Stack spacing={0.5}>
                  {request.files.slice(0, 3).map((file) => (
                    <Box 
                      key={file.id}
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1,
                        p: 0.5,
                        borderRadius: 1,
                        bgcolor: 'action.hover',
                        '&:hover': {
                          bgcolor: 'action.selected'
                        }
                      }}
                    >
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          flex: 1,
                          fontSize: '0.75rem',
                          color: 'text.secondary',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {file.name}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFilePreview(file);
                        }}
                        sx={{ 
                          p: 0.25,
                          '&:hover': {
                            bgcolor: 'info.main',
                            color: 'info.contrastText'
                          }
                        }}
                      >
                        <VisibilityIcon fontSize="inherit" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFileDownload(file);
                        }}
                        sx={{ 
                          p: 0.25,
                          '&:hover': {
                            bgcolor: 'primary.main',
                            color: 'primary.contrastText'
                          }
                        }}
                      >
                        <DownloadIcon fontSize="inherit" />
                      </IconButton>
                    </Box>
                  ))}
                  {request.files.length > 3 && (
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: 'text.secondary',
                        fontStyle: 'italic',
                        fontSize: '0.75rem'
                      }}
                    >
                      +{request.files.length - 3} archivos más
                    </Typography>
                  )}
                </Stack>
              </Box>
            </Box>
          )}
        </Stack>
      </CardContent>
      
      {/* Actions positioned at bottom-right following Material UI best practices */}
      <CardActions sx={{ 
        justifyContent: 'flex-end', 
        p: 2,
        pt: 1,
        gap: 1,
        borderTop: `1px solid ${theme.palette.divider}`,
        bgcolor: theme.palette.action.hover,
        borderBottomLeftRadius: '16px',
        borderBottomRightRadius: '16px'
      }}>
        <IconButton 
          size="small" 
          onClick={() => handleOpenDialog(request)}
          sx={{ 
            color: 'primary.main',
            '&:hover': {
              bgcolor: 'primary.light',
              color: 'primary.contrastText'
            }
          }}
          title="Editar solicitud"
        >
          <EditIcon fontSize="small" />
        </IconButton>
        
        <IconButton 
          size="small" 
          onClick={() => handleDeleteRequest(request.id)}
          sx={{ 
            color: 'error.main',
            '&:hover': {
              bgcolor: 'error.light',
              color: 'error.contrastText'
            }
          }}
          title="Eliminar solicitud"
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
        
        {request.stage !== 'completed' && (
          <IconButton 
            size="small" 
            onClick={() => handleMoveRequest(request.id)}
            sx={{ 
              color: 'success.main',
              '&:hover': {
                bgcolor: 'success.light',
                color: 'success.contrastText'
              }
            }}
            disabled={request.stage === 'completed'}
            title={`Mover a ${workflowStages[workflowStages.findIndex(stage => stage.id === request.stage) + 1]?.label || ''}`}
          >
            <ArrowForwardIcon fontSize="small" />
          </IconButton>
        )}
      </CardActions>
    </Card>
  );

  return (
    <Box sx={{ width: '100%', maxWidth: '1400px', margin: '0 auto', p: { xs: theme.spacing(2), sm: theme.spacing(3) } }}>
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
            <AssignmentIcon sx={{ fontSize: 32, color: 'common.white' }} />
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
              Gestión de Producción
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{
                color: 'text.secondary',
                fontWeight: theme.typography.fontWeightRegular,
                mt: 0.5
              }}
            >
              Seguimiento de solicitudes en el flujo de producción
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Paper
        elevation={3}
        sx={{
          p: { xs: theme.spacing(2), sm: theme.spacing(3), md: theme.spacing(4) },
          mb: theme.spacing(4),
          bgcolor: 'background.paper',
          borderRadius: Number(theme.shape.borderRadius) * 2,
          border: `1px solid ${theme.palette.divider}`
        }}
      >
        <Stack direction="row" alignItems="center" spacing={3}>
          <Box
            sx={{
              p: theme.spacing(2),
              borderRadius: theme.spacing(1),
              bgcolor: 'action.hover',
              border: `1px solid ${theme.palette.divider}`
            }}
          >
            <PersonIcon sx={{ fontSize: 28, color: 'primary.main' }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography 
              variant="h6" 
              sx={{
                color: 'text.primary',
                fontWeight: theme.typography.fontWeightBold,
                mb: 0.5
              }}
            >
              Sesión Activa
            </Typography>
            <Typography 
              variant="body1"
              sx={{
                color: 'text.secondary',
                lineHeight: 1.6
              }}
            >
              Conectado como{' '}
              <Box component="span" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                {user?.name}
              </Box>
              {' '}({user?.email})
            </Typography>
          </Box>
        </Stack>
      </Paper>

      <Paper
        elevation={2}
        sx={{
          bgcolor: 'background.paper',
          borderRadius: Number(theme.shape.borderRadius) * 2,
          border: `1px solid ${theme.palette.divider}`,
          overflow: 'hidden',
          mb: 4
        }}
      >
        <Box
          sx={{
            p: theme.spacing(4),
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: `1px solid ${theme.palette.divider}`,
            bgcolor: 'action.hover'
          }}
        >
          <Box>
            <Typography 
              variant="h5" 
              sx={{
                color: 'text.primary',
                fontWeight: theme.typography.fontWeightBold,
                mb: 0.5
              }}
            >
              Solicitudes de Producción
            </Typography>
            <Typography 
              variant="body2" 
              sx={{
                color: 'text.secondary',
                fontWeight: theme.typography.fontWeightMedium
              }}
            >
              Gestiona y realiza seguimiento de las solicitudes en el flujo de producción
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{
              fontWeight: theme.typography.fontWeightBold,
              px: theme.spacing(3),
              py: theme.spacing(1),
              borderRadius: theme.spacing(1),
              textTransform: 'none'
            }}
          >
            Nueva Solicitud
          </Button>
        </Box>
      </Paper>
 
      {/* Production Requests List */}
      <Box sx={{ mt: 4 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <Typography variant="body1" color="text.secondary">
              Cargando solicitudes...
            </Typography>
          </Box>
        ) : error ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <Typography variant="body1" color="error">
              {error}
            </Typography>
          </Box>
        ) : productionRequests.length === 0 ? (
          <Paper
            elevation={1}
            sx={{
              p: 6,
              textAlign: 'center',
              bgcolor: 'background.paper',
              borderRadius: Number(theme.shape.borderRadius) * 2,
              border: `1px solid ${theme.palette.divider}`
            }}
          >
            <AssignmentIcon 
              sx={{ 
                fontSize: 64, 
                color: 'text.secondary', 
                mb: 2 
              }} 
            />
            <Typography 
              variant="h6" 
              sx={{ 
                color: 'text.secondary', 
                mb: 1,
                fontWeight: theme.typography.fontWeightMedium
              }}
            >
              No hay solicitudes de producción
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'text.secondary',
                mb: 3
              }}
            >
              Comienza creando tu primera solicitud de producción
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              sx={{
                fontWeight: theme.typography.fontWeightBold,
                px: theme.spacing(3),
                py: theme.spacing(1),
                borderRadius: theme.spacing(1),
                textTransform: 'none'
              }}
            >
              Nueva Solicitud
            </Button>
          </Paper>
        ) : (
           <Box sx={{ 
             display: 'grid', 
             gridTemplateColumns: { 
               xs: '1fr', 
               sm: 'repeat(2, 1fr)', 
               md: 'repeat(2, 1fr)', 
               lg: 'repeat(3, 1fr)',
               xl: 'repeat(4, 1fr)'
             }, 
             gap: { xs: 2, sm: 3, md: 4 },
             alignItems: 'stretch'
           }}>
             {productionRequests.map((request) => (
               renderRequestCard(request)
             ))}
           </Box>
         )}
      </Box>
 
      {/* Dialog for creating/editing production requests */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {formData.id ? 'Editar Solicitud' : 'Nueva Solicitud de Producción'}
        </DialogTitle>
        <DialogContent>
          <Box 
            sx={{ 
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 3,
              mt: 1
            }}
          >
            <Box sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
              <TextField 
                fullWidth
                label="Nombre de la solicitud"
                name="name"
                value={formData.name || ''}
                onChange={handleInputChange}
                required
                margin="normal"
              />
            </Box>
            
            <Box>
              <TextField
                fullWidth
                label="Departamento"
                name="department"
                value={formData.department || ''}
                onChange={handleInputChange}
                required
                margin="normal"
              />
            </Box>
 
            <Box>
              <TextField
                fullWidth
                label="Persona de contacto"
                name="contactPerson"
                value={formData.contactPerson || ''}
                onChange={handleInputChange}
                required
                margin="normal"
              />
            </Box>
            
            <Box>
              <TextField
                fullWidth
                label="Equipo asignado"
                name="assignedTeam"
                value={formData.assignedTeam || ''}
                onChange={handleInputChange}
                required
                margin="normal"
              />
            </Box>
            
            <Box>
              <TextField
                fullWidth
                label="Fecha de entrega"
                name="deliveryDate"
                type="date"
                value={formData.deliveryDate || ''}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
                margin="normal"
              />
            </Box>
            
            <Box sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
              <TextField
                fullWidth
                label="Observaciones"
                name="observations"
                value={formData.observations || ''}
                onChange={handleInputChange}
                multiline
                rows={4}
                margin="normal"
              />
            </Box>
            
            <Box sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
              <Typography variant="h6" sx={{ mb: 2, mt: 2 }}>
                Archivos adjuntos
              </Typography>
              
              {/* Existing files from storage */}
              {formData.id && formData.files && formData.files.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                    Archivos existentes en almacenamiento:
                  </Typography>
                  <Stack spacing={1}>
                    {formData.files.map((file) => (
                      <Box 
                        key={file.id}
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1,
                          p: 1.5,
                          borderRadius: 1,
                          bgcolor: 'action.hover',
                          border: '1px solid',
                          borderColor: 'divider',
                          '&:hover': {
                            bgcolor: 'action.selected'
                          }
                        }}
                      >
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {file.name}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: 'text.secondary',
                            minWidth: 'fit-content'
                          }}
                        >
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFilePreview(file);
                          }}
                          sx={{ 
                            '&:hover': {
                              bgcolor: 'info.main',
                              color: 'info.contrastText'
                            }
                          }}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFileDownload(file);
                          }}
                          sx={{ 
                            '&:hover': {
                              bgcolor: 'primary.main',
                              color: 'primary.contrastText'
                            }
                          }}
                        >
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}
              
              <FileUpload
                files={uploadedFiles}
                onFilesChange={handleFileUpload}
                acceptedTypes={['.pdf', '.xlsx', '.xls', '.mp3', '.mp4', '.jpg', '.jpeg', '.png', '.gif', '.doc', '.docx']}
                maxFiles={10}
                maxFileSize={50} // 50MB
                disabled={isUploading}
                label="Arrastra archivos aquí o haz clic para seleccionar"
                helperText="Formatos soportados: PDF, Excel, Audio, Video, Imágenes, Documentos (máx. 50MB por archivo)"
              />
              
              {/* Upload Progress */}
              {isUploading && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Subiendo archivos a Azure Storage...
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: '100%' }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={uploadProgress} 
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {Math.round(uploadProgress)}%
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
            
            {formData.id && (
              <Box sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Etapa</InputLabel>
                  <Select
                    name="stage"
                    value={formData.stage || ''}
                    onChange={(e) => handleSelectChange(e as any)}
                    label="Etapa"
                  >
                    {workflowStages.map((stage) => (
                      <MenuItem key={stage.id} value={stage.id}>
                        {stage.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={handleCloseDialog} 
            variant="outlined"
            disabled={isUploading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            disabled={isUploading}
            startIcon={formData.id ? <EditIcon /> : <AddIcon />}
          >
            {isUploading 
              ? 'Subiendo archivos...' 
              : formData.id 
                ? 'Actualizar' 
                : 'Crear'
            }
          </Button>
        </DialogActions>
      </Dialog>
 
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
 
      {/* File Preview Modal */}
      {previewFile && (
        <FilePreview
          file={previewFile}
          open={isPreviewOpen}
          onClose={handleClosePreview}
          onDownload={() => handlePreviewDownload(previewFile)}
        />
      )}
    </Box>
  );
};
 
export default Production;
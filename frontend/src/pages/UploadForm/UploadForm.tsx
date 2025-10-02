import React from "react";
import { 
  Box, 
  Button, 
  LinearProgress, 
  Typography, 
  Alert, 
  Stepper, 
  Step, 
  StepLabel, 
  Paper, 
  Fade, 
  IconButton,
  Container,
  Stack,
  Card,
  CardContent,
  Chip,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar
} from "@mui/material";
import { 
  ArrowBack as ArrowBackIcon, 
  Dashboard as DashboardIcon, 
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  CheckCircle as CheckCircleIcon,
  Folder as FolderIcon
} from "@mui/icons-material";
import { useAuth } from '../../contexts/AuthContext';
import { PERMISSIONS } from '../../constants/auth';
// import claroMediaLogo from "../../assets/Claro-Media-Logo.jpg";
import DarkModeToggle from "../../components/DarkModeToggle";
import { useUploadForm } from './useUploadForm';
import type { UploadFormProps } from './types';

const steps = [
  "Tipo de Usuario",
  "Subir Excel", 
  "Subir PDF",
  "Materiales y Confirmación"
];

const UploadForm: React.FC<UploadFormProps> = (props) => {
  const { hasPermission } = useAuth();
  const {
    state,
    handleExcelChange,
    handlePdfChange,
    handleMaterialesChange,
    handleNotifyN8N,
    setTipoUsuario,
    setActiveStep,
    setMessage,
    setManualPdfConfirmation,
    setUploadCompleted,
    setDeseaSubirMateriales,
    setMateriales,
    setPdfUploaded
  } = useUploadForm(props);

  const renderExcelPreview = () => {
    if (!state.excelFile) return null;
    
    return (
      <Paper 
        elevation={2} 
        sx={{ 
          p: theme => theme.spacing(2), 
          mb: theme => theme.spacing(2), 
          bgcolor: 'action.hover',
          border: theme => `1px solid ${theme.palette.divider}`
        }}
      >
        <Typography 
          variant="subtitle2" 
          sx={{
            fontWeight: theme => theme.typography.fontWeightBold,
            mb: theme => theme.spacing(1),
            color: 'text.primary'
          }}
        >
          Previsualización de Excel:
        </Typography>
        <List dense>
          {state.debugExcelValues.map((v, i) => (
            <ListItem key={i} sx={{ py: 0.5 }}>
              <ListItemText 
                primary={v} 
                primaryTypographyProps={{
                  variant: 'body2',
                  color: 'text.secondary'
                }}
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    );
  };

  const renderPdfPreview = () => {
    if (!state.pdfFile || !state.pdfUploaded || !state.pdfThumbnail) return null;
    
    return (
      <Paper 
        elevation={2} 
        sx={{ 
          p: theme => theme.spacing(2), 
          mb: theme => theme.spacing(2), 
          bgcolor: 'action.hover',
          border: theme => `1px solid ${theme.palette.divider}`,
          textAlign: 'center'
        }}
      >
        <Typography 
          variant="subtitle2" 
          sx={{
            fontWeight: theme => theme.typography.fontWeightBold,
            mb: theme => theme.spacing(1),
            color: 'text.primary'
          }}
        >
          Previsualización PDF:
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <Box
            component="iframe"
            src={state.pdfThumbnail}
            sx={{
              width: '100%',
              height: '300px',
              border: 'none',
              borderRadius: theme => theme.spacing(0.5),
              boxShadow: theme => theme.shadows[2]
            }}
          />
          <Typography variant="body2" color="text.secondary">
            {state.pdfFile.name} ({Math.round(state.pdfFile.size / 1024)} KB)
          </Typography>
        </Box>
      </Paper>
    );
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Fade in={state.activeStep === 0}>
            <Box>
              <Typography 
                variant="h5" 
                sx={{ 
                  mb: theme => theme.spacing(3), 
                  fontWeight: theme => theme.typography.fontWeightBold, 
                  textAlign: 'center', 
                  color: 'text.primary'
                }}
              >
                Selecciona Cliente o Agencia
              </Typography>
              
              <Stack spacing={2} alignItems="center">
                <Card
                  elevation={state.tipoUsuario === 'cliente' ? 8 : 2}
                  sx={{
                    width: theme => theme.spacing(35),
                    height: theme => theme.spacing(12.5),
                    cursor: 'pointer',
                    transition: theme => theme.transitions.create(['transform', 'box-shadow', 'border'], {
                      duration: theme.transitions.duration.standard,
                    }),
                    border: theme => state.tipoUsuario === 'cliente' 
                      ? `3px solid ${theme.palette.primary.main}` 
                      : `2px solid transparent`,
                    bgcolor: state.tipoUsuario === 'cliente' ? 'action.selected' : 'background.paper',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: theme => theme.shadows[8]
                    }
                  }}
                  onClick={() => setTipoUsuario('cliente')}
                >
                  <CardContent sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    height: '100%',
                    p: theme => theme.spacing(2)
                  }}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <PersonIcon sx={{ fontSize: 48, color: 'primary.main' }} />
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          fontWeight: theme => theme.typography.fontWeightBold, 
                          color: 'text.primary'
                        }}
                      >
                        Cliente
                      </Typography>
                    </Stack>
                    {state.tipoUsuario === 'cliente' && (
                      <CheckCircleIcon sx={{ color: 'success.main', fontSize: 24 }} />
                    )}
                  </CardContent>
                </Card>

                <Card
                  elevation={state.tipoUsuario === 'agencia' ? 8 : 2}
                  sx={{
                    width: theme => theme.spacing(35),
                    height: theme => theme.spacing(12.5),
                    cursor: 'pointer',
                    transition: theme => theme.transitions.create(['transform', 'box-shadow', 'border'], {
                      duration: theme.transitions.duration.standard,
                    }),
                    border: theme => state.tipoUsuario === 'agencia' 
                      ? `3px solid ${theme.palette.primary.main}` 
                      : `2px solid transparent`,
                    bgcolor: state.tipoUsuario === 'agencia' ? 'action.selected' : 'background.paper',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: theme => theme.shadows[8]
                    }
                  }}
                  onClick={() => setTipoUsuario('agencia')}
                >
                  <CardContent sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    height: '100%',
                    p: theme => theme.spacing(2)
                  }}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <BusinessIcon sx={{ fontSize: 48, color: 'primary.main' }} />
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          fontWeight: theme => theme.typography.fontWeightBold, 
                          color: 'text.primary'
                        }}
                      >
                        Agencia
                      </Typography>
                    </Stack>
                    {state.tipoUsuario === 'agencia' && (
                      <CheckCircleIcon sx={{ color: 'success.main', fontSize: 24 }} />
                    )}
                  </CardContent>
                </Card>
              </Stack>

              <Button
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                sx={{ 
                  mt: theme => theme.spacing(4),
                  fontWeight: theme => theme.typography.fontWeightBold,
                  py: theme => theme.spacing(1.5),
                  borderRadius: theme => theme.spacing(1)
                }}
                onClick={() => {
                  setActiveStep(1);
                  setMessage("");
                }}
                disabled={!state.tipoUsuario}
              >
                Siguiente
              </Button>
            </Box>
          </Fade>
        );
      case 1:
        return (
          <Fade in={state.activeStep === 1}>
            <Box>
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  mt: theme => theme.spacing(2), 
                  mb: theme => theme.spacing(1), 
                  fontWeight: theme => theme.typography.fontWeightBold, 
                  color: 'text.primary'
                }}
              >
                1. Sube el archivo Excel (Valorización)
              </Typography>
              <Stack direction="row" alignItems="center" justifyContent="center" spacing={2} sx={{ my: 2 }}>
                <input
                  id="excel-input"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelChange}
                  style={{ display: 'none' }}
                  disabled={state.uploading || state.excelUploaded}
                />
                <Button
                  variant="outlined"
                  onClick={() => document.getElementById('excel-input')?.click()}
                  sx={{
                    borderRadius: theme => theme.spacing(0.75),
                    fontWeight: theme => theme.typography.fontWeightMedium
                  }}
                  disabled={state.uploading || state.excelUploaded}
                >
                  Seleccionar archivo
                </Button>
                {state.excelFile && (
                  <Typography variant="body2" color="text.secondary">
                    {state.excelFile.name}
                  </Typography>
                )}
              </Stack>
              {renderExcelPreview()}
              <Button
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                sx={{ 
                  mt: theme => theme.spacing(2), 
                  fontWeight: theme => theme.typography.fontWeightBold,
                  py: theme => theme.spacing(1.5),
                  borderRadius: theme => theme.spacing(1)
                }}
                onClick={() => {
                  setActiveStep(2);
                  setMessage("");
                  const excelInput = document.getElementById("excel-input") as HTMLInputElement;
                  if (excelInput) excelInput.value = "";
                }}
                disabled={!state.excelUploaded}
              >
                Siguiente
              </Button>
            </Box>
          </Fade>
        );
      case 2:
        return (
          <Fade in={state.activeStep === 2}>
            <Box>
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  mt: theme => theme.spacing(2), 
                  mb: theme => theme.spacing(1), 
                  fontWeight: theme => theme.typography.fontWeightBold, 
                  color: 'text.primary'
                }}
              >
                2. Sube el archivo PDF (Orden de Compra)
              </Typography>
              <Stack direction="row" alignItems="center" justifyContent="center" spacing={2} sx={{ my: 2 }}>
                <input
                  id="pdf-input"
                  type="file"
                  accept=".pdf"
                  onChange={handlePdfChange}
                  style={{ display: 'none' }}
                  disabled={state.uploading || state.pdfUploaded}
                />
                <Button
                  variant="outlined"
                  onClick={() => document.getElementById('pdf-input')?.click()}
                  sx={{
                    borderRadius: theme => theme.spacing(0.75),
                    fontWeight: theme => theme.typography.fontWeightMedium
                  }}
                  disabled={state.uploading || state.pdfUploaded}
                >
                  Seleccionar archivo
                </Button>
                {state.pdfFile && (
                  <Typography variant="body2" color="text.secondary">
                    {state.pdfFile.name}
                  </Typography>
                )}
              </Stack>
              {renderPdfPreview()}
              {state.pdfUploaded && (
                <Box sx={{ mt: theme => theme.spacing(2), mb: theme => theme.spacing(1), textAlign: 'center' }}>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      fontWeight: theme => theme.typography.fontWeightMedium, 
                      mb: theme => theme.spacing(1), 
                      color: 'text.primary'
                    }}
                  >
                    ¿Este documento contiene las dos firmas requeridas?
                  </Typography>
                  <Stack direction="row" spacing={2} justifyContent="center">
                    <Button
                      variant={state.manualPdfConfirmation === true ? "contained" : "outlined"}
                      color="success"
                      sx={{
                        fontWeight: theme => theme.typography.fontWeightBold,
                        borderRadius: theme => theme.spacing(1)
                      }}
                      onClick={() => {
                        setManualPdfConfirmation(true);
                        setMessage("✅ PDF subido correctamente.");
                      }}
                      disabled={!state.pdfUploaded}
                    >
                      ✅ Sí, continuar
                    </Button>
                    <Button
                      variant={state.manualPdfConfirmation === false ? "contained" : "outlined"}
                      color="error"
                      sx={{ 
                        fontWeight: theme => theme.typography.fontWeightBold,
                        borderRadius: theme => theme.spacing(1)
                      }}
                      onClick={() => {
                        setManualPdfConfirmation(null);
                        setPdfUploaded(false);
                        const pdfInput = document.getElementById("pdf-input") as HTMLInputElement;
                        if (pdfInput) pdfInput.value = "";
                        setMessage("");
                      }}
                      disabled={!state.pdfUploaded}
                    >
                      🔄 No, volver a subir
                    </Button>
                  </Stack>
                </Box>
              )}
              {state.pdfWarning && (
                <Alert severity="warning" sx={{ mt: 2, mb: 1 }}>
                  {state.pdfWarning}
                </Alert>
              )}
              {state.pdfUploaded && state.manualPdfConfirmation === true && (
                <Button
                  id="siguiente-button"
                  variant="contained"
                  color="primary"
                  fullWidth
                  size="large"
                  sx={{ 
                    mt: theme => theme.spacing(2),
                    fontWeight: theme => theme.typography.fontWeightBold,
                    py: theme => theme.spacing(1.5),
                    borderRadius: theme => theme.spacing(1)
                  }}
                  onClick={() => {
                    setActiveStep(3);
                    setMessage("");
                    const pdfInput = document.getElementById("pdf-input") as HTMLInputElement;
                    if (pdfInput) pdfInput.value = "";
                  }}
                >
                  Siguiente
                </Button>
              )}
            </Box>
          </Fade>
        );
      case 3:
        if (state.envioExitoso && !state.uploadCompleted) {
          return (
            <Fade in={true}>
              <Box sx={{ textAlign: 'center', mt: theme => theme.spacing(4) }}>
                <Alert 
                  severity="success" 
                  sx={{ 
                    fontSize: 18, 
                    fontWeight: theme => theme.typography.fontWeightBold, 
                    mb: theme => theme.spacing(3)
                  }}
                >
                  ✅ ¡Archivos enviados correctamente!
                </Alert>
                <Paper 
                  elevation={1} 
                  sx={{ 
                    p: theme => theme.spacing(2), 
                    mt: theme => theme.spacing(2), 
                    bgcolor: 'action.hover',
                    border: theme => `1px solid ${theme.palette.divider}`
                  }}
                >
                  <Typography 
                    variant="subtitle2" 
                    sx={{
                      fontWeight: theme => theme.typography.fontWeightBold,
                      mb: theme => theme.spacing(1),
                      color: 'text.primary'
                    }}
                  >
                    Resumen del envío:
                  </Typography>
                  <List dense>
                    <ListItem sx={{ py: 0.5 }}>
                      <ListItemText 
                        primary={`Tipo: ${state.tipoUsuario === 'cliente' ? 'Cliente' : 'Agencia'}`}
                        primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                      />
                    </ListItem>
                    <ListItem sx={{ py: 0.5 }}>
                      <ListItemText 
                        primary={`Excel: ${state.excelFile?.name || 'No seleccionado'}`}
                        primaryTypographyProps={{ 
                          variant: 'body2', 
                          color: state.excelFile?.name ? 'text.secondary' : 'text.disabled'
                        }}
                      />
                    </ListItem>
                    <ListItem sx={{ py: 0.5 }}>
                      <ListItemText 
                        primary={`PDF: ${state.pdfFile?.name || 'No seleccionado'}`}
                        primaryTypographyProps={{ 
                          variant: 'body2', 
                          color: state.pdfFile?.name ? 'text.secondary' : 'text.disabled'
                        }}
                      />
                    </ListItem>
                    <ListItem sx={{ py: 0.5 }}>
                      <ListItemText 
                        primary={`Materiales: ${state.materiales.length > 0 ? state.materiales.length + ' archivo(s)' : 'Ninguno'}`}
                        primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                      />
                    </ListItem>
                  </List>
                </Paper>
              </Box>
            </Fade>
          );
        }
        
        return (
          <Fade in={state.activeStep === 3}>
            <Box>
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  mt: theme => theme.spacing(2), 
                  mb: theme => theme.spacing(1), 
                  fontWeight: theme => theme.typography.fontWeightBold, 
                  color: 'text.primary'
                }}
              >
                3. ¿Desea subir materiales?
              </Typography>
              <FormControl component="fieldset" sx={{ mb: 2 }}>
                <RadioGroup
                  row
                  value={state.deseaSubirMateriales === null ? '' : state.deseaSubirMateriales ? 'si' : 'no'}
                  onChange={(e) => {
                    const value = e.target.value === 'si';
                    if (!value) {
                      setMateriales([]);
                      const materialesInput = document.getElementById("materiales-input") as HTMLInputElement;
                      if (materialesInput) materialesInput.value = "";
                    }
                    setDeseaSubirMateriales(value);
                  }}
                >
                  <FormControlLabel 
                    value="si" 
                    control={<Radio />} 
                    label="Sí" 
                    disabled={state.uploading}
                  />
                  <FormControlLabel 
                    value="no" 
                    control={<Radio />} 
                    label="No" 
                    disabled={state.uploading}
                  />
                </RadioGroup>
              </FormControl>
              <Stack direction="row" alignItems="center" justifyContent="center" spacing={2} sx={{ my: 2 }}>
                <input
                  id="materials-input"
                  type="file"
                  multiple
                  onChange={handleMaterialesChange}
                  style={{ display: 'none' }}
                  disabled={state.uploading || state.deseaSubirMateriales !== true}
                />
                <Button
                  variant="outlined"
                  onClick={() => document.getElementById('materials-input')?.click()}
                  sx={{
                    borderRadius: theme => theme.spacing(0.75),
                    fontWeight: theme => theme.typography.fontWeightMedium
                  }}
                  disabled={state.uploading || state.deseaSubirMateriales !== true}
                >
                  Seleccionar archivos
                </Button>
                {state.materiales.length > 0 && (
                  <Chip 
                    label={`${state.materiales.length} archivo(s) seleccionado(s)`}
                    color="primary"
                    variant="outlined"
                  />
                )}
              </Stack>
              {state.materiales.length > 0 && state.deseaSubirMateriales === true && (
                <Stack spacing={1} sx={{ mt: 1, mb: 2 }}>
                  {state.materiales.map((file, idx) => (
                    <Paper
                      key={idx}
                      elevation={1}
                      sx={{
                        p: theme => theme.spacing(1.5),
                        bgcolor: 'action.hover',
                        border: theme => `1px solid ${theme.palette.divider}`,
                        borderRadius: theme => theme.spacing(1),
                        minHeight: theme => theme.spacing(5)
                      }}
                    >
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <FolderIcon sx={{ color: 'primary.main', fontSize: 24 }} />
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: theme => theme.typography.fontWeightMedium,
                              color: 'text.primary'
                            }}
                            title={file.name}
                          >
                            {file.name}
                          </Typography>
                        </Stack>
                        <CheckCircleIcon 
                          sx={{ 
                            color: 'success.main', 
                            fontSize: 20
                          }}
                          titleAccess="Archivo listo para subir"
                        />
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}
              <Paper 
                elevation={1} 
                sx={{ 
                  p: theme => theme.spacing(2), 
                  mt: theme => theme.spacing(2), 
                  bgcolor: 'action.hover',
                  border: theme => `1px solid ${theme.palette.divider}`
                }}
              >
                <Typography 
                  variant="subtitle2" 
                  sx={{
                    fontWeight: theme => theme.typography.fontWeightBold,
                    mb: theme => theme.spacing(1),
                    color: 'text.primary'
                  }}
                >
                  Resumen:
                </Typography>
                <List dense>
                  <ListItem sx={{ py: 0.5 }}>
                    <ListItemText 
                      primary={`Tipo: ${state.tipoUsuario === 'cliente' ? 'Cliente' : 'Agencia'}`}
                      primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                    />
                  </ListItem>
                  <ListItem sx={{ py: 0.5 }}>
                    <ListItemText 
                      primary={`Excel: ${state.excelFile?.name || 'No seleccionado'}`}
                      primaryTypographyProps={{ 
                        variant: 'body2', 
                        color: state.excelFile?.name ? 'text.secondary' : 'text.disabled'
                      }}
                    />
                  </ListItem>
                  <ListItem sx={{ py: 0.5 }}>
                    <ListItemText 
                      primary={`PDF: ${state.pdfFile?.name || 'No seleccionado'}`}
                      primaryTypographyProps={{ 
                        variant: 'body2', 
                        color: state.pdfFile?.name ? 'text.secondary' : 'text.disabled'
                      }}
                    />
                  </ListItem>
                  <ListItem sx={{ py: 0.5 }}>
                    <ListItemText 
                      primary={`Materiales: ${state.materiales.length > 0 ? state.materiales.length + ' archivo(s)' : 'Ninguno'}`}
                      primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                    />
                  </ListItem>
                </List>
              </Paper>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                sx={{ 
                  mt: theme => theme.spacing(2), 
                  fontWeight: theme => theme.typography.fontWeightBold,
                  py: theme => theme.spacing(2),
                  borderRadius: theme => theme.spacing(1)
                }}
                onClick={handleNotifyN8N}
                disabled={state.uploading || (state.deseaSubirMateriales === true ? state.materiales.length === 0 : state.deseaSubirMateriales === null)}
              >
                Enviar archivos
              </Button>
            </Box>
          </Fade>
        );
      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        bgcolor: 'background.default',
        color: 'text.primary',
        top: theme => theme.spacing(8),
        transition: theme => theme.transitions.create(['background-color'], {
          duration: theme.transitions.duration.standard,
        }),
        position: 'relative',
        overflow: 'auto'
      }}
    >        
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 4 }}>
        <Avatar
            src="/Claro-Media-Logo.jpg"
            alt="Claro Media Logo"
            className="heartbeat"
            sx={{
              width: theme => theme.spacing(32.5),
              height: theme => theme.spacing(12),
              borderRadius: 0
            }}
          />
      </Box>
      
      <Container maxWidth="sm" sx={{ mb: 4 }}>
        <Paper 
          elevation={2} 
          sx={{ 
            p: theme => theme.spacing(4), 
            borderRadius: theme => theme.spacing(2), 
            bgcolor: 'background.paper',
            border: theme => `1px solid ${theme.palette.divider}`,
            boxShadow: theme => theme.shadows[4]
          }}
        >
        <Stepper activeStep={state.activeStep} alternativeLabel sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel
                StepIconProps={{
                  sx: {
                    color: 'primary.main',
                    '&.Mui-active': { color: 'primary.main' },
                    '&.Mui-completed': { color: 'primary.main' }
                  }
                }}
                sx={{
                  '& .MuiStepLabel-label': {
                    color: 'text.primary'
                  }
                }}
              >
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {state.uploading && (
          <LinearProgress sx={{ mb: 2 }} />
        )}
        
        {renderStepContent(state.activeStep)}
        
        {state.message && (
          <Alert severity={state.message.startsWith("✅") ? "success" : "error"} sx={{ mt: 2, mb: 1 }}>
            {state.message}
          </Alert>
        )}
        </Paper>
      </Container>
    </Box>
  );
};

export default UploadForm;
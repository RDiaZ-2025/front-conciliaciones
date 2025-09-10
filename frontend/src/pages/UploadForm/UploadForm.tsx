import React from "react";
import { Box, Button, LinearProgress, Typography, Alert, Stepper, Step, StepLabel, Paper, Fade, IconButton } from "@mui/material";
import { ArrowBack as ArrowBackIcon, Dashboard as DashboardIcon, AdminPanelSettings as AdminIcon } from "@mui/icons-material";
import { useAuth } from '../../contexts/AuthContext';
import { PERMISSIONS } from '../../constants/auth';
import claroMediaLogo from "../../assets/Claro-Media-Logo.jpg";
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
    setMateriales
  } = useUploadForm(props);

  const renderExcelPreview = () => {
    if (!state.excelFile) return null;
    
    return (
      <Paper elevation={2} sx={{ p: 2, mb: 2, background: props.darkMode ? '#2a2d3a' : '#f8fafc' }}>
        <Typography variant="subtitle2" fontWeight={600} mb={1} sx={{ color: props.darkMode ? '#fff' : '#000' }}>Previsualización de Excel:</Typography>
        <ul style={{ margin: 0, paddingLeft: 18, color: props.darkMode ? '#fff' : '#000' }}>
          {state.debugExcelValues.map((v, i) => (
            <li key={i} style={{ fontSize: 15 }}>{v}</li>
          ))}
        </ul>
      </Paper>
    );
  };

  const renderPdfPreview = () => {
    if (!state.pdfFile || !state.pdfUploaded || !state.pdfThumbnail) return null;
    
    return (
      <Paper elevation={2} sx={{ p: 2, mb: 2, background: props.darkMode ? '#2a2d3a' : '#f8fafc', textAlign: 'center' }}>
        <Typography variant="subtitle2" fontWeight={600} mb={1} sx={{ color: props.darkMode ? '#fff' : '#000' }}>Previsualización PDF:</Typography>
        <img 
          src={state.pdfThumbnail} 
          alt="Miniatura PDF" 
          style={{ 
            maxWidth: 180, 
            borderRadius: 4, 
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)' 
          }} 
        />
      </Paper>
    );
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Fade in={state.activeStep === 0}>
            <Box>
              <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, textAlign: 'center', color: props.darkMode ? '#fff' : '#222' }}>
                Selecciona Cliente o Agencia
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                <Paper
                  elevation={state.tipoUsuario === 'cliente' ? 8 : 2}
                  sx={{
                    p: 2,
                    width: 280,
                    height: 100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    border: state.tipoUsuario === 'cliente' ? '3px solid #222' : '2px solid transparent',
                    background: state.tipoUsuario === 'cliente' 
                      ? (props.darkMode ? '#4A5568' : '#f8fafc') 
                      : (props.darkMode ? '#2D3748' : '#fff'),
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
                    }
                  }}
                  onClick={() => setTipoUsuario('cliente')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ fontSize: 48 }}>👤</Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: props.darkMode ? '#fff' : '#222' }}>
                      Cliente
                    </Typography>
                  </Box>
                  {state.tipoUsuario === 'cliente' && (
                    <Box sx={{ color: '#4CAF50', fontWeight: 600, fontSize: 18 }}>
                      ✓
                    </Box>
                  )}
                </Paper>

                <Paper
                  elevation={state.tipoUsuario === 'agencia' ? 8 : 2}
                  sx={{
                    p: 2,
                    width: 280,
                    height: 100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    border: state.tipoUsuario === 'agencia' ? '3px solid #222' : '2px solid transparent',
                    background: state.tipoUsuario === 'agencia' 
                      ? (props.darkMode ? '#4A5568' : '#f8fafc') 
                      : (props.darkMode ? '#2D3748' : '#fff'),
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
                    }
                  }}
                  onClick={() => setTipoUsuario('agencia')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ fontSize: 48 }}>🏢</Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: props.darkMode ? '#fff' : '#222' }}>
                      Agencia
                    </Typography>
                  </Box>
                  {state.tipoUsuario === 'agencia' && (
                    <Box sx={{ color: '#4CAF50', fontWeight: 600, fontSize: 18 }}>
                      ✓
                    </Box>
                  )}
                </Paper>
              </Box>

              <Button
                variant="contained"
                color="primary"
                fullWidth
                sx={{ 
                  mt: 4,
                  fontWeight: 600, 
                  fontSize: 16, 
                  py: 1.5,
                  borderRadius: 2, 
                  background: '#222', 
                  '&:hover': { background: '#111' },
                  '&:disabled': { background: '#ccc' }
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
              <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, fontWeight: 600, color: props.darkMode ? '#fff' : '#000' }}>
                1. Sube el archivo Excel (Valorización)
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, margin: '16px auto' }}>
                <input
                  id="excel-input"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelChange}
                  style={{ display: 'none' }}
                  disabled={state.uploading || state.excelUploaded}
                />
                <Button
                  variant={props.darkMode ? "contained" : "outlined"}
                  component="label"
                  htmlFor="excel-input"
                  sx={{
                    backgroundColor: props.darkMode ? '#4A5568' : 'transparent',
                    color: props.darkMode ? 'white' : 'black',
                    border: props.darkMode ? 'none' : '1px solid black',
                    '&:hover': {
                      backgroundColor: props.darkMode ? '#2D3748' : '#f5f5f5',
                    },
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                  disabled={state.uploading || state.excelUploaded}
                >
                  Seleccionar archivo
                </Button>
                {state.excelFile && (
                  <Typography sx={{ color: props.darkMode ? 'white' : 'inherit' }}>
                    {state.excelFile.name}
                  </Typography>
                )}
              </Box>
              {renderExcelPreview()}
              <Button
                variant="contained"
                color="primary"
                fullWidth
                sx={{ mt: 2, fontWeight: 600, fontSize: 16, py: 1.5, borderRadius: 2, background: '#222', '&:hover': { background: '#111' } }}
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
              <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, fontWeight: 600, color: props.darkMode ? '#fff' : '#000' }}>
                2. Sube el archivo PDF (Orden de Compra)
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, margin: '16px auto' }}>
                <input
                  id="pdf-input"
                  type="file"
                  accept=".pdf"
                  onChange={handlePdfChange}
                  style={{ display: 'none' }}
                  disabled={state.uploading || state.pdfUploaded}
                />
                <Button
                  variant={props.darkMode ? "contained" : "outlined"}
                  component="label"
                  htmlFor="pdf-input"
                  sx={{
                    backgroundColor: props.darkMode ? '#4A5568' : 'transparent',
                    color: props.darkMode ? 'white' : 'black',
                    border: props.darkMode ? 'none' : '1px solid black',
                    '&:hover': {
                      backgroundColor: props.darkMode ? '#2D3748' : '#f5f5f5',
                    },
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                  disabled={state.uploading || state.pdfUploaded}
                >
                  Seleccionar archivo
                </Button>
                {state.pdfFile && (
                  <Typography sx={{ color: props.darkMode ? 'white' : 'inherit' }}>
                    {state.pdfFile.name}
                  </Typography>
                )}
              </Box>
              {renderPdfPreview()}
              {state.pdfUploaded && state.pdfThumbnail && (
                <Box sx={{ mt: 2, mb: 1, textAlign: 'center' }}>
                  <Typography variant="body1" sx={{ fontWeight: 500, mb: 1, color: props.darkMode ? '#fff' : '#000' }}>
                    ¿Este documento contiene las dos firmas requeridas?
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                    <Button
                      variant={state.manualPdfConfirmation === true ? "contained" : "outlined"}
                      color="success"
                      sx={{
                        fontWeight: 600,
                        borderWidth: 2,
                        borderColor: '#222 !important',
                        boxShadow: state.manualPdfConfirmation === true ? '0 0 0 2px #222 !important' : undefined,
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
                        fontWeight: 600, 
                        borderWidth: 2, 
                        borderColor: '#222 !important', 
                        color: state.manualPdfConfirmation === false ? '#fff' : '#d32f2f', 
                        background: state.manualPdfConfirmation === false ? '#d32f2f' : undefined, 
                        boxShadow: state.manualPdfConfirmation === false ? '0 0 0 2px #222' : undefined 
                      }}
                      onClick={() => {
                        setManualPdfConfirmation(false);
                        const pdfInput = document.getElementById("pdf-input") as HTMLInputElement;
                        if (pdfInput) pdfInput.value = "";
                        setMessage("");
                      }}
                      disabled={!state.pdfUploaded}
                    >
                      🔄 No, volver a subir
                    </Button>
                  </Box>
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
                  sx={{ 
                    mt: 2, 
                    fontWeight: 600, 
                    fontSize: 16,
                    py: 1.5,
                    borderRadius: 2,
                    background: '#222',
                    '&:hover': { 
                      background: '#111'
                    }
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
              <Box sx={{ textAlign: 'center', mt: 4 }}>
                <Alert severity="success" sx={{ fontSize: 18, fontWeight: 600, mb: 3 }}>
                  ✅ ¡Archivos enviados correctamente!
                </Alert>
                <Paper elevation={1} sx={{ p: 2, mt: 2, background: props.darkMode ? '#2a2d3a' : '#f8fafc' }}>
                  <Typography variant="subtitle2" fontWeight={600} mb={1} sx={{ color: props.darkMode ? '#fff' : '#000' }}>Resumen del envío:</Typography>
                  <ul style={{ margin: 0, paddingLeft: 18, color: props.darkMode ? '#fff' : '#000' }}>
                    <li>Tipo: {state.tipoUsuario === 'cliente' ? 'Cliente' : 'Agencia'}</li>
                    <li>Excel: {state.excelFile?.name || <span style={{ color: '#aaa' }}>No seleccionado</span>}</li>
                    <li>PDF: {state.pdfFile?.name || <span style={{ color: '#aaa' }}>No seleccionado</span>}</li>
                    <li>Materiales: {state.materiales.length > 0 ? state.materiales.length + ' archivo(s)' : 'Ninguno'}</li>
                  </ul>
                </Paper>
                <Button
                  variant="outlined"
                  color="primary"
                  sx={{ mt: 3, fontWeight: 600, fontSize: 16, py: 1, borderRadius: 2, background: '#222', color: '#fff', '&:hover': { background: '#111' } }}
                  onClick={() => { setUploadCompleted(true); props.onUploadComplete(); }}
                >
                  Continuar
                </Button>
              </Box>
            </Fade>
          );
        }
        
        return (
          <Fade in={state.activeStep === 3}>
            <Box>
              <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, fontWeight: 600, color: props.darkMode ? '#fff' : '#000' }}>
                3. ¿Desea subir materiales?
              </Typography>
              <Box sx={{ display: 'flex', gap: 3, mb: 2 }}>
                <label style={{ color: props.darkMode ? '#fff' : '#000', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="deseaSubirMateriales"
                    value="si"
                    checked={state.deseaSubirMateriales === true}
                    onChange={() => setDeseaSubirMateriales(true)}
                    disabled={state.uploading}
                    style={{ accentColor: '#222' }}
                  />
                  Sí
                </label>
                <label style={{ color: props.darkMode ? '#fff' : '#000', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="deseaSubirMateriales"
                    value="no"
                    checked={state.deseaSubirMateriales === false}
                    onChange={() => {
                      setDeseaSubirMateriales(false);
                      setMateriales([]);
                      const materialesInput = document.getElementById("materiales-input") as HTMLInputElement;
                      if (materialesInput) materialesInput.value = "";
                    }}
                    disabled={state.uploading}
                    style={{ accentColor: '#222' }}
                  />
                  No
                </label>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, margin: '16px auto' }}>
                <input
                  id="materiales-input"
                  type="file"
                  multiple
                  onChange={handleMaterialesChange}
                  style={{ display: 'none' }}
                  disabled={state.uploading || state.deseaSubirMateriales !== true}
                />
                <Button
                  variant={props.darkMode ? "contained" : "outlined"}
                  component="label"
                  htmlFor="materiales-input"
                  sx={{
                    backgroundColor: props.darkMode ? '#4A5568' : 'transparent',
                    color: props.darkMode ? 'white' : 'black',
                    border: props.darkMode ? 'none' : '1px solid black',
                    '&:hover': {
                      backgroundColor: props.darkMode ? '#2D3748' : '#f5f5f5',
                    },
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                  disabled={state.uploading || state.deseaSubirMateriales !== true}
                >
                  Seleccionar archivos
                </Button>
                {state.materiales.length > 0 && (
                  <Typography sx={{ color: props.darkMode ? 'white' : 'inherit' }}>
                    {state.materiales.length} archivo(s) seleccionado(s)
                  </Typography>
                )}
              </Box>
              {state.materiales.length > 0 && state.deseaSubirMateriales === true && (
                <Box sx={{ mt: 1, mb: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {state.materiales.map((file, idx) => (
                    <Box key={idx} sx={{
                      display: 'flex',
                      alignItems: 'center',
                      background: '#f5f7fa',
                      borderRadius: 2,
                      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                      px: 2,
                      py: 1.2,
                      fontWeight: 600,
                      fontSize: 15,
                      color: '#222',
                      minHeight: 38,
                      justifyContent: 'space-between'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontSize: 22, marginRight: 12, color: '#1976d2' }}>📁</span>
                        <span title={file.name}>{file.name}</span>
                      </Box>
                      <span
                        style={{
                          fontSize: 20,
                          marginLeft: 18,
                          color: '#1976d2',
                          cursor: 'pointer',
                          userSelect: 'none',
                          transition: 'color 0.2s',
                        }}
                        title="Archivo listo para subir"
                      >
                        ✔️
                      </span>
                    </Box>
                  ))}
                </Box>
              )}
              <Paper elevation={1} sx={{ p: 2, mt: 2, background: props.darkMode ? '#2a2d3a' : '#f8fafc' }}>
                <Typography variant="subtitle2" fontWeight={600} mb={1} sx={{ color: props.darkMode ? '#fff' : '#000' }}>Resumen:</Typography>
                <ul style={{ margin: 0, paddingLeft: 18, color: props.darkMode ? '#fff' : '#000' }}>
                  <li>Tipo: {state.tipoUsuario === 'cliente' ? 'Cliente' : 'Agencia'}</li>
                  <li>Excel: {state.excelFile?.name || <span style={{ color: '#aaa' }}>No seleccionado</span>}</li>
                  <li>PDF: {state.pdfFile?.name || <span style={{ color: '#aaa' }}>No seleccionado</span>}</li>
                  <li>Materiales: {state.materiales.length > 0 ? state.materiales.length + ' archivo(s)' : 'Ninguno'}</li>
                </ul>
              </Paper>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                sx={{ mt: 2, fontWeight: 600, fontSize: 16, py: 2, borderRadius: 2, background: '#222', '&:hover': { background: '#111' } }}
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
        background: props.darkMode ? '#23232b' : 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
        color: props.darkMode ? '#fff' : '#181C32',
        fontFamily: 'Inter, Segoe UI, Roboto, sans-serif',
        transition: 'background 0.3s',
        position: 'relative',
        overflow: 'auto'
      }}
    >
      {!props.hideHeader && (
        <Box sx={{ width: "100%", position: "relative", mt: 5, mb: 2, background: "transparent", boxShadow: "none", border: "none" }}>
          <IconButton
            onClick={props.onBackToLogin}
            sx={{
              position: "absolute",
              left: 24,
              top: "50%",
              transform: "translateY(-50%)",
              color: props.darkMode ? "#fff" : "#222",
              '&:hover': {
                backgroundColor: props.darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
              }
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          
          <Box sx={{ position: "absolute", right: 24, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", gap: 1 }}>
            {hasPermission(PERMISSIONS.MANAGEMENT_DASHBOARD) && (
              <IconButton
                onClick={props.onGoToDashboard}
                sx={{
                  color: props.darkMode ? "#fff" : "#181C32",
                  background: props.darkMode ? 'rgba(230, 0, 38, 0.05)' : 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: 2,
                  border: props.darkMode ? '1px solid rgba(230, 0, 38, 0.2)' : '1px solid rgba(24, 28, 50, 0.1)',
                  boxShadow: 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    backgroundColor: props.darkMode ? 'rgba(230, 0, 38, 0.15)' : 'rgba(24, 28, 50, 0.05)',
                    transform: 'translateY(-2px)',
                    boxShadow: 'none'
                  }
                }}
                title="Ir al Dashboard"
              >
                <DashboardIcon />
              </IconButton>
            )}
            {hasPermission(PERMISSIONS.ADMIN_PANEL) && (
              <IconButton
                onClick={props.onGoToAdmin}
                sx={{
                  color: props.darkMode ? "#fff" : "#181C32",
                  background: props.darkMode ? 'rgba(230, 0, 38, 0.05)' : 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: 2,
                  border: props.darkMode ? '1px solid rgba(230, 0, 38, 0.2)' : '1px solid rgba(24, 28, 50, 0.1)',
                  boxShadow: 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    backgroundColor: props.darkMode ? 'rgba(230, 0, 38, 0.15)' : 'rgba(24, 28, 50, 0.05)',
                    transform: 'translateY(-2px)',
                    boxShadow: 'none'
                  }
                }}
                title="Ir al Panel de Administración"
              >
                <AdminIcon />
              </IconButton>
            )}
            <DarkModeToggle 
              darkMode={props.darkMode} 
              setDarkMode={props.setDarkMode} 
              onLogoClick={props.onBackToLogin}
            />
          </Box>
          
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
            <img
              src={claroMediaLogo}
              alt="Claro Media Data Tech"
              style={{ width: 180 }}
            />
          </Box>
        </Box>
      )}
      
      <Paper 
        elevation={0} 
        sx={{ 
          p: 4, 
          borderRadius: 3, 
          width: "100%",
          maxWidth: 500,
          boxShadow: "none",
          background: props.darkMode ? "#4A5568" : "#fff",
          mx: 'auto',
          mb: 4, 
          pb: 4 
        }}
      >
        <Stepper activeStep={state.activeStep} alternativeLabel sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel
                StepIconProps={{
                  sx: {
                    color: '#222',
                    '&.Mui-active': { color: '#222' },
                    '&.Mui-completed': { color: '#222' }
                  }
                }}
                sx={{
                  '& .MuiStepLabel-label': {
                    color: props.darkMode ? '#fff' : '#000'
                  }
                }}
              >
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {state.uploading && (
          <LinearProgress sx={{ mb: 2, '& .MuiLinearProgress-bar': { backgroundColor: '#000' }, backgroundColor: '#e0e0e0' }} />
        )}
        
        {renderStepContent(state.activeStep)}
        
        {state.message && (
          <Alert severity={state.message.startsWith("✅") ? "success" : "error"} sx={{ mt: 2, mb: 1 }}>
            {state.message}
          </Alert>
        )}
      </Paper>
    </Box>
  );
};

export default UploadForm;
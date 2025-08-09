import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  TextField, 
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,

  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';

import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import claroMediaLogo from "../assets/Claro-Media-Logo.jpg";
import DarkModeToggle from "./DarkModeToggle";
import HamburgerMenu from "./HamburgerMenu";
import CustomDatePicker from "./CustomDatePicker";

const CierreVentas = ({ darkMode, setDarkMode, onBack }) => {
  const [filtroEdicion, setFiltroEdicion] = useState('');
  const [edicionEditando, setEdicionEditando] = useState(null);
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [datosEdicion, setDatosEdicion] = useState({});
  const [calculoAutomaticoActivo, setCalculoAutomaticoActivo] = useState(true);

  const [modoCreacion, setModoCreacion] = useState(false);

  // Función para calcular fechas automáticamente según las reglas de negocio
  const calcularFechasAutomaticas = (fechaCirculacion, periodicidad = 30) => {
    if (!fechaCirculacion) return {};
    
    const fechaCirc = new Date(fechaCirculacion);
    
    // Regla 1: Fecha de recolección = 30 días después de circulación (según periodicidad)
    const fechaRecoleccion = new Date(fechaCirc);
    fechaRecoleccion.setDate(fechaCirc.getDate() + periodicidad);
    
    // Regla 2: Fecha de cierre = 60 días después de recolección
    const fechaCierre = new Date(fechaRecoleccion);
    fechaCierre.setDate(fechaRecoleccion.getDate() + 60);
    
    // Regla 3: Fecha de pago = 30 días después de entrega de nota crédito (estimamos desde cierre)
    const fechaPago = new Date(fechaCierre);
    fechaPago.setDate(fechaCierre.getDate() + 30);
    
    // Regla 4: Cierre extemporáneo = 90 días después del cierre inicial
    const fechaCierreExtemporaneo = new Date(fechaCierre);
    fechaCierreExtemporaneo.setDate(fechaCierre.getDate() + 90);
    
    return {
      fechaRecoleccion: fechaRecoleccion.toISOString().split('T')[0],
      fechaCierre: fechaCierre.toISOString().split('T')[0],
      fechaPago: fechaPago.toISOString().split('T')[0],
      fechaCierreExtemporaneo: fechaCierreExtemporaneo.toISOString().split('T')[0]
    };
  };

  // Función para obtener colores distintivos para cada estado
  const obtenerColorEstado = (estado) => {
    const colores = {
      'Sin Programar': { bg: '#374151', text: '#D1D5DB', border: '#6B7280' },
      'Programada': { bg: '#1F2937', text: '#F3F4F6', border: '#9CA3AF' },
      'Circulando': { bg: '#0F4C75', text: '#E0F2FE', border: '#0EA5E9' },
      'Recolección Vencida': { bg: '#92400E', text: '#FEF3C7', border: '#F59E0B' },
      'Generando Reportes': { bg: '#4C1D95', text: '#E0E7FF', border: '#8B5CF6' },
      'Pendiente Cierre': { bg: '#92400E', text: '#FEF3C7', border: '#F59E0B' },
      'Cierre Vencido': { bg: '#991B1B', text: '#FEE2E2', border: '#EF4444' },
      'Cierre Extemporáneo': { bg: '#BE185D', text: '#FDE2E7', border: '#EC4899' },
      'Esperando Pago': { bg: '#1E3A8A', text: '#DBEAFE', border: '#3B82F6' },
      'Pago Vencido': { bg: '#7F1D1D', text: '#FEF2F2', border: '#DC2626' },
      'Finalizada': { bg: '#0F766E', text: '#F0FDFA', border: '#14B8A6' }
    };
    
    return colores[estado] || { bg: '#374151', text: '#D1D5DB', border: '#6B7280' };
  };

  // Función para calcular el estado automáticamente basado en las fechas y reglas de negocio
  const calcularEstadoAutomatico = (edicion) => {
    const hoy = new Date();
    const fechaCirculacion = edicion.fechaCirculacion ? new Date(edicion.fechaCirculacion) : null;
    const fechaRecoleccion = edicion.fechaRecoleccion ? new Date(edicion.fechaRecoleccion) : null;
    const fechaGeneracion = edicion.fechaGeneracion ? new Date(edicion.fechaGeneracion) : null;
    const fechaCierre = edicion.fechaCierre ? new Date(edicion.fechaCierre) : null;
    const fechaPago = edicion.fechaPago ? new Date(edicion.fechaPago) : null;

    // Si no hay fecha de circulación, está sin programar
    if (!fechaCirculacion) {
      return "Sin Programar";
    }

    // Calcular fechas esperadas según las reglas
    const periodicidad = parseInt(edicion.periodicidad) || 30;
    const fechasCalculadas = calcularFechasAutomaticas(edicion.fechaCirculacion, periodicidad);
    
    const fechaRecoleccionEsperada = new Date(fechasCalculadas.fechaRecoleccion);
    const fechaCierreEsperada = new Date(fechasCalculadas.fechaCierre);
    const fechaPagoEsperada = new Date(fechasCalculadas.fechaPago);
    const fechaCierreExtemporaneo = new Date(fechaCierreEsperada);
    fechaCierreExtemporaneo.setDate(fechaCierreEsperada.getDate() + 90);

    // Si todas las fechas están completas y el pago se realizó
    if (fechaCirculacion && fechaRecoleccion && fechaGeneracion && fechaCierre && fechaPago) {
      return "Finalizada";
    }
    
    // Si tiene cierre pero no pago
    if (fechaCierre && !fechaPago) {
      // Si ya pasó mucho tiempo sin pago, podría ser extemporáneo
      if (hoy > fechaCierreExtemporaneo) {
        return "Pago Vencido";
      }
      return "Esperando Pago";
    }
    
    // Si ya pasó la fecha de cierre esperada sin cerrar
    if (hoy > fechaCierreEsperada && !fechaCierre) {
      // Si está muy vencido, requiere cierre extemporáneo
      if (hoy > fechaCierreExtemporaneo) {
        return "Cierre Extemporáneo";
      }
      return "Cierre Vencido";
    }
    
    // Si ya pasó la fecha de recolección esperada
    if (hoy > fechaRecoleccionEsperada) {
      // Si ya se recolectó pero no se generó reporte
      if (fechaRecoleccion && !fechaGeneracion) {
        return "Generando Reportes";
      }
      // Si ya se generó reporte pero no se cerró
      if (fechaGeneracion && !fechaCierre) {
        return "Pendiente Cierre";
      }
      // Si no se ha recolectado
      if (!fechaRecoleccion) {
        return "Recolección Vencida";
      }
    }
    
    // Si ya pasó la fecha de circulación
    if (hoy >= fechaCirculacion) {
      // Si ya se recolectó
      if (fechaRecoleccion) {
        // Si ya se generó reporte
        if (fechaGeneracion) {
          return "Pendiente Cierre";
        }
        return "Generando Reportes";
      }
      // Está en período de recolección
      return "Circulando";
    }
    
    // Si aún no ha llegado la fecha de circulación
    return "Programada";
  };

  // Estado para las ediciones
  const [ediciones, setEdiciones] = useState([
    {
      id: 1,
      numeroEdicion: "2024-001",
      fechaCirculacion: "2024-01-01",
      fechaRecoleccion: "2024-01-15",
      fechaGeneracion: "2024-02-15",
      fechaCierre: "2024-03-15",
      fechaPago: "2024-04-14",
      periodicidad: "30 días",
      estado: "Completada"
    },
    {
      id: 2,
      numeroEdicion: "2024-002",
      fechaCirculacion: "2024-02-01",
      fechaRecoleccion: "2024-02-15",
      fechaGeneracion: "2024-03-15",
      fechaCierre: "2024-04-15",
      fechaPago: "",
      periodicidad: "30 días",
      estado: "En Proceso"
    },
    {
      id: 3,
      numeroEdicion: "2024-003",
      fechaCirculacion: "2024-03-01",
      fechaRecoleccion: "",
      fechaGeneracion: "",
      fechaCierre: "",
      fechaPago: "",
      periodicidad: "30 días",
      estado: "Pendiente"
    },
    {
      id: 4,
      numeroEdicion: "2024-004",
      fechaCirculacion: "2024-04-01",
      fechaRecoleccion: "2024-04-15",
      fechaGeneracion: "2024-05-15",
      fechaCierre: "",
      fechaPago: "",
      periodicidad: "30 días",
      estado: "En Proceso"
    }
  ]);

  // useEffect para validación automática diaria (solo al cargar el componente)
  useEffect(() => {
    const validarEstadosAutomaticamente = () => {
      setEdiciones(prevEdiciones => 
        prevEdiciones.map(edicion => ({
          ...edicion,
          estado: calcularEstadoAutomatico(edicion)
        }))
      );
    };

    // Validar solo al cargar el componente por primera vez
    validarEstadosAutomaticamente();

    // Comentamos la validación automática para evitar que sobrescriba cambios del usuario
    // const intervalo = setInterval(validarEstadosAutomaticamente, 24 * 60 * 60 * 1000);
    // return () => clearInterval(intervalo);
  }, []);

  // Filtrar ediciones basado en el filtro
  const edicionesFiltradas = ediciones.filter(edicion =>
    edicion.numeroEdicion.toLowerCase().includes(filtroEdicion.toLowerCase()) ||
    edicion.estado.toLowerCase().includes(filtroEdicion.toLowerCase())
  );

  const getEstadoColor = (estado) => {
    const colores = obtenerColorEstado(estado);
    return { bg: colores.bg, color: colores.text };
  };



  // Función para abrir el diálogo de edición
  const abrirEdicion = (edicion) => {
    setModoCreacion(false);
    setEdicionEditando(edicion);
    // Convertir periodicidad de "30 días" a número para el campo
    const periodicidadNumerica = edicion.periodicidad === "30 días" ? 30 : parseInt(edicion.periodicidad) || 30;
    setDatosEdicion({ 
      id: edicion.id || '',
      numeroEdicion: edicion.numeroEdicion || '',
      fechaCirculacion: edicion.fechaCirculacion || '',
      fechaRecoleccion: edicion.fechaRecoleccion || '',
      fechaGeneracion: edicion.fechaGeneracion || '',
      fechaCierre: edicion.fechaCierre || '',
      fechaPago: edicion.fechaPago || '',
      periodicidad: periodicidadNumerica,
      estado: edicion.estado || ''
    });
    setDialogoAbierto(true);
  };

  // Función para crear nueva edición
  const crearNuevaEdicion = () => {
    setModoCreacion(true);
    setEdicionEditando(null);
    // Generar nuevo número de edición
    const ultimaEdicion = ediciones.length > 0 ? Math.max(...ediciones.map(e => parseInt(e.numeroEdicion.split('-')[1]))) : 0;
    const nuevoNumero = `2024-${String(ultimaEdicion + 1).padStart(3, '0')}`;
    
    // Datos por defecto para nueva edición
    const hoy = new Date().toISOString().split('T')[0];
    setDatosEdicion({
      id: Date.now().toString(),
      numeroEdicion: nuevoNumero,
      fechaCirculacion: '',
      fechaRecoleccion: '',
      fechaGeneracion: '',
      fechaCierre: '',
      fechaPago: '',
      periodicidad: 30,
      estado: 'Sin Programar'
    });
    setDialogoAbierto(true);
  };

  // Función para guardar cambios
  const guardarCambios = () => {
    console.log('=== GUARDANDO CAMBIOS ===');
    console.log('Datos de edición actuales:', datosEdicion);
    console.log('Modo creación:', modoCreacion);
    
    // Calcular el estado automáticamente basado en las fechas
    const estadoCalculado = calcularEstadoAutomatico(datosEdicion);
    console.log('Estado calculado:', estadoCalculado);
    
    if (modoCreacion) {
      // Crear nueva edición
      const nuevaEdicion = {
        ...datosEdicion,
        periodicidad: `${datosEdicion.periodicidad} días`, // Convertir de vuelta a formato string
        estado: estadoCalculado // Usar el estado calculado automáticamente
      };
      
      // Agregar a la lista de ediciones usando setEdiciones
      setEdiciones(prevEdiciones => {
        const nuevasEdiciones = [...prevEdiciones, nuevaEdicion];
        console.log('Nueva edición creada:', nuevaEdicion);
        console.log('Lista actualizada de ediciones:', nuevasEdiciones);
        return nuevasEdiciones;
      });
    } else {
      // Editar edición existente
      setEdiciones(prevEdiciones => {
        const edicionesActualizadas = prevEdiciones.map(edicion => 
          edicion.id === datosEdicion.id 
            ? {
                ...datosEdicion,
                periodicidad: `${datosEdicion.periodicidad} días`, // Convertir de vuelta a formato string
                estado: estadoCalculado // Usar el estado calculado automáticamente
              }
            : edicion
        );
        console.log('Edición actualizada para ID:', datosEdicion.id);
        console.log('Datos actualizados:', {
          ...datosEdicion,
          periodicidad: `${datosEdicion.periodicidad} días`,
          estado: estadoCalculado
        });
        console.log('Lista actualizada de ediciones:', edicionesActualizadas);
        return edicionesActualizadas;
      });
    }
    
    // Cerrar diálogo y limpiar estados
    setDialogoAbierto(false);
    setEdicionEditando(null);
    setModoCreacion(false);
    setDatosEdicion({});
    console.log('=== FIN GUARDADO ===');
  };

  // Función para cancelar edición
  const cancelarEdicion = () => {
    setDialogoAbierto(false);
    setEdicionEditando(null);
    setModoCreacion(false);
    setDatosEdicion({});
  };



  const handleCierreVentasClick = () => {
    // Ya estamos en cierre de ventas, no hacer nada
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        background: darkMode ? "#2D3748" : "linear-gradient(135deg, #e0e7ff 0%, #f8fafc 100%)",
        color: darkMode ? "#fff" : "#181C32",
        transition: "background 0.3s, color 0.3s",
        overflowX: "hidden",
        overflowY: "auto"
      }}
    >
      {/* Contenedor con scroll */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          minHeight: "100vh",
          width: "100%",
          pb: 4
        }}
      >
      {/* Menú hamburguesa en la esquina superior izquierda */}
      <Box sx={{ position: "absolute", top: 16, left: 16, zIndex: 1000 }}>
        <HamburgerMenu 
          darkMode={darkMode} 
          onCierreVentasClick={handleCierreVentasClick}
        />
      </Box>

      {/* Botón de regreso */}
      <Box sx={{ position: "absolute", top: 16, left: 70, zIndex: 1000 }}>
        <Button
          onClick={onBack}
          startIcon={<ArrowBackIcon />}
          sx={{
            color: darkMode ? '#fff' : '#000',
            '&:hover': {
              backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
            }
          }}
        >
          Volver
        </Button>
      </Box>

      {/* DarkModeToggle en la esquina superior derecha */}
      <Box sx={{ position: "absolute", top: 16, right: 40, zIndex: 1000 }}>
        <DarkModeToggle 
          darkMode={darkMode} 
          setDarkMode={setDarkMode} 
        />
      </Box>
      
      {/* Header con logo centrado */}
      <Box sx={{ width: "100%", display: "flex", alignItems: "center", mt: 5, mb: 2, position: "relative", px: 3 }}>
        <img
          src={claroMediaLogo}
          alt="Claro Media Data Tech"
          style={{ width: 180, margin: "0 auto", display: "block" }}
        />
      </Box>

      {/* Título de la sección */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography 
          variant="h3" 
          sx={{ 
            fontWeight: 700, 
            color: darkMode ? '#E6EDF3' : '#1a202c',
            textAlign: 'center',
            background: darkMode 
          ? 'linear-gradient(135deg, #E6EDF3 0%, #9CA3AF 100%)' 
          : 'linear-gradient(135deg, #000 0%, #333 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 1,
            textShadow: darkMode ? '0 2px 4px rgba(0,0,0,0.3)' : 'none'
          }}
        >
          CIERRE DE VENTAS
        </Typography>
        <Typography 
          variant="subtitle1" 
          sx={{ 
            color: darkMode ? '#E6EDF3' : '#64748b',
            fontWeight: 500,
            opacity: darkMode ? 0.9 : 1
          }}
        >
          Gestión y control de periodicidad de ventas
        </Typography>
      </Box>


      
      {/* Contenedor principal de la tabla */}
      <Paper 
        elevation={6} 
        sx={{ 
          p: 3, 
          borderRadius: 4, 
          width: "95%",
          maxWidth: 1400,
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.10)", 
          background: darkMode ? "#4A5568" : "#fff",
          mx: 3,
          mb: 3,
          maxHeight: "70vh",
          display: "flex",
          flexDirection: "column"
        }}
      >
        {/* Barra de herramientas */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 3,
          flexWrap: 'wrap',
          gap: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <TextField
              variant="outlined"
              placeholder="Buscar por edición o estado..."
              value={filtroEdicion}
              onChange={(e) => setFiltroEdicion(e.target.value)}
              size="small"
              sx={{
                minWidth: 300,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: darkMode ? '#2D3748' : '#f8fafc',
                  color: darkMode ? '#fff' : '#1a202c',
                  borderRadius: 2,
                  '& fieldset': {
                    borderColor: darkMode ? '#4a5568' : '#e2e8f0',
                  },
                  '&:hover fieldset': {
                    borderColor: darkMode ? '#81c784' : '#000',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: darkMode ? '#81c784' : '#000',
                  },
                },
              }}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: darkMode ? '#a0aec0' : '#64748b', mr: 1 }} />
              }}
            />
          </Box>
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={crearNuevaEdicion}
            sx={{
              background: darkMode 
                ? 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)'
                : 'linear-gradient(135deg, #000 0%, #333 100%)',
              '&:hover': {
                background: darkMode 
                  ? 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)'
                  : 'linear-gradient(135deg, #333 0%, #111 100%)',
              }
            }}
          >
            Nueva Edición
          </Button>
        </Box>

        {/* Tabla de ediciones */}
        <TableContainer sx={{ 
          borderRadius: 2, 
          overflow: 'auto',
          flexGrow: 1,
          maxHeight: 'calc(70vh - 200px)'
        }}>
          <Table>
            <TableHead>
              <TableRow sx={{ 
                background: darkMode 
                  ? 'linear-gradient(135deg, #181C32 0%, #2D3748 100%)'
                  : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                borderBottom: darkMode ? '2px solid #4A5568' : '2px solid #e2e8f0'
              }}>
                <TableCell sx={{ 
                  fontWeight: 700, 
                  color: darkMode ? '#E6EDF3' : '#1a202c',
                  fontSize: '0.9rem',
                  textShadow: darkMode ? '0 1px 2px rgba(0,0,0,0.5)' : 'none'
                }}>
                  N° Edición
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 700, 
                  color: darkMode ? '#E6EDF3' : '#1a202c',
                  fontSize: '0.9rem',
                  textShadow: darkMode ? '0 1px 2px rgba(0,0,0,0.5)' : 'none'
                }}>
                  F. Circulación
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 700, 
                  color: darkMode ? '#E6EDF3' : '#1a202c',
                  fontSize: '0.9rem',
                  textShadow: darkMode ? '0 1px 2px rgba(0,0,0,0.5)' : 'none'
                }}>
                  F. Recolección
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 700, 
                  color: darkMode ? '#E6EDF3' : '#1a202c',
                  fontSize: '0.9rem',
                  textShadow: darkMode ? '0 1px 2px rgba(0,0,0,0.5)' : 'none'
                }}>
                  F. Generación
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 700, 
                  color: darkMode ? '#E6EDF3' : '#1a202c',
                  fontSize: '0.9rem',
                  textShadow: darkMode ? '0 1px 2px rgba(0,0,0,0.5)' : 'none'
                }}>
                  F. Cierre Ventas
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 700, 
                  color: darkMode ? '#E6EDF3' : '#1a202c',
                  fontSize: '0.9rem',
                  textShadow: darkMode ? '0 1px 2px rgba(0,0,0,0.5)' : 'none'
                }}>
                  F. Pago
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 700, 
                  color: darkMode ? '#E6EDF3' : '#1a202c',
                  fontSize: '0.9rem',
                  textShadow: darkMode ? '0 1px 2px rgba(0,0,0,0.5)' : 'none'
                }}>
                  Periodicidad
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 700, 
                  color: darkMode ? '#E6EDF3' : '#1a202c',
                  fontSize: '0.9rem',
                  textShadow: darkMode ? '0 1px 2px rgba(0,0,0,0.5)' : 'none'
                }}>
                  Estado
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 700, 
                  color: darkMode ? '#E6EDF3' : '#1a202c',
                  fontSize: '0.9rem',
                  textShadow: darkMode ? '0 1px 2px rgba(0,0,0,0.5)' : 'none'
                }}>
                  Acciones
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {edicionesFiltradas.map((edicion, index) => (
                <TableRow 
                  key={edicion.id}
                  sx={{ 
                    '&:nth-of-type(odd)': {
                      backgroundColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.02)',
                    },
                    '&:hover': {
                      backgroundColor: darkMode ? 'rgba(156, 163, 175, 0.15)' : 'rgba(0,0,0,0.05)',
                    },
                    transition: 'background-color 0.2s ease',
                    borderBottom: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)'
                  }}
                >
                  <TableCell sx={{ 
                    color: darkMode ? '#fff' : '#1a202c',
                    fontWeight: 600,
                    fontSize: '0.85rem'
                  }}>
                    {edicion.numeroEdicion}
                  </TableCell>
                  <TableCell sx={{ color: darkMode ? '#E6EDF3' : '#64748b', fontSize: '0.85rem', opacity: darkMode ? 0.9 : 1 }}>
                    {edicion.fechaCirculacion || '-'}
                  </TableCell>
                  <TableCell sx={{ color: darkMode ? '#E6EDF3' : '#64748b', fontSize: '0.85rem', opacity: darkMode ? 0.9 : 1 }}>
                    {edicion.fechaRecoleccion || '-'}
                  </TableCell>
                  <TableCell sx={{ color: darkMode ? '#E6EDF3' : '#64748b', fontSize: '0.85rem', opacity: darkMode ? 0.9 : 1 }}>
                    {edicion.fechaGeneracion || '-'}
                  </TableCell>
                  <TableCell sx={{ color: darkMode ? '#E6EDF3' : '#64748b', fontSize: '0.85rem', opacity: darkMode ? 0.9 : 1 }}>
                    {edicion.fechaCierre || '-'}
                  </TableCell>
                  <TableCell sx={{ color: darkMode ? '#E6EDF3' : '#64748b', fontSize: '0.85rem', opacity: darkMode ? 0.9 : 1 }}>
                    {edicion.fechaPago || '-'}
                  </TableCell>
                  <TableCell sx={{ color: darkMode ? '#E6EDF3' : '#64748b', fontSize: '0.85rem', opacity: darkMode ? 0.9 : 1 }}>
                    {edicion.periodicidad}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={edicion.estado}
                      sx={{
                        backgroundColor: getEstadoColor(edicion.estado).bg,
                        color: getEstadoColor(edicion.estado).color,
                        fontWeight: 600,
                        fontSize: '0.85rem'
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Editar">
                      <IconButton
                        size="small"
                        onClick={() => abrirEdicion(edicion)}
                        sx={{
                          color: darkMode ? '#D1D5DB' : '#000',
                          '&:hover': {
                            backgroundColor: darkMode ? 'rgba(209, 213, 219, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                          }
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Información adicional */}
        <Box sx={{ 
          mt: 3, 
          p: 2, 
          borderRadius: 2,
          background: darkMode 
            ? 'rgba(156, 163, 175, 0.15)' 
            : 'rgba(0, 0, 0, 0.05)',
          border: `1px solid ${darkMode ? 'rgba(156, 163, 175, 0.3)' : 'rgba(0, 0, 0, 0.1)'}`
        }}>
          <Typography variant="body2" sx={{ 
            color: darkMode ? '#E6EDF3' : '#64748b',
            textAlign: 'center',
            fontWeight: darkMode ? 500 : 400
          }}>
            Total de ediciones: {edicionesFiltradas.length} | 
            Completadas: {edicionesFiltradas.filter(e => e.estado === 'Completada').length} | 
            En proceso: {edicionesFiltradas.filter(e => e.estado === 'En Proceso').length} | 
            Pendientes: {edicionesFiltradas.filter(e => e.estado === 'Pendiente').length}
          </Typography>
        </Box>
      </Paper>

      {/* Diálogo de Edición */}
      <Dialog 
        open={dialogoAbierto} 
        onClose={cancelarEdicion}
        maxWidth="lg"
        fullWidth
        scroll="body"
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: darkMode 
              ? 'linear-gradient(135deg, #1a202c 0%, #2d3748 100%)'
              : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
            minHeight: 'auto',
            maxHeight: '95vh',
            width: '90vw',
            margin: '16px',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ 
          color: darkMode ? '#fff' : '#1a202c',
          fontWeight: 700,
          fontSize: '1.5rem',
          borderBottom: `1px solid ${darkMode ? '#4a5568' : '#e2e8f0'}`,
          pb: 2
        }}>
          {modoCreacion ? `Crear Nueva Edición ${datosEdicion.numeroEdicion}` : `Editar Edición ${edicionEditando?.numeroEdicion}`}
        </DialogTitle>
        
        <DialogContent sx={{ 
          pt: 2, 
          pb: 1,
          overflowY: 'auto',
          maxHeight: 'calc(95vh - 140px)'
        }}>
          {/* Texto explicativo */}
          <Box sx={{ 
            mb: 3, 
            p: 2, 
            borderRadius: 2,
            background: darkMode 
              ? 'rgba(156, 163, 175, 0.1)' 
              : 'rgba(59, 130, 246, 0.1)',
            border: `1px solid ${darkMode ? 'rgba(156, 163, 175, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body2" sx={{ 
                color: darkMode ? '#a0aec0' : '#64748b',
                fontSize: '0.9rem',
                lineHeight: 1.5,
                flex: 1
              }}>
                <strong>📅 Sistema de Validación Inteligente:</strong><br/>
                • Puede ingresar las fechas <strong>manualmente</strong> o usar el <strong>cálculo automático</strong><br/>
                • <strong>Cálculo automático:</strong> Al ingresar Fecha de Circulación + Periodicidad<br/>
                &nbsp;&nbsp;- Recolección: +30 días desde circulación<br/>
                &nbsp;&nbsp;- Cierre de ventas: +60 días desde recolección<br/>
                • El <strong>estado se actualiza automáticamente</strong> según las fechas ingresadas y el día actual<br/>
                • La <strong>fecha de pago</strong> se calcula automáticamente por el sistema cuando TELMEX entrega la nota de crédito
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column', alignItems: 'flex-end' }}>
                <Button
                  variant={calculoAutomaticoActivo ? "contained" : "outlined"}
                  size="small"
                  onClick={() => setCalculoAutomaticoActivo(!calculoAutomaticoActivo)}
                  sx={{
                    backgroundColor: calculoAutomaticoActivo 
                      ? (darkMode ? '#6B7280' : '#1976d2') 
                      : 'transparent',
                    color: calculoAutomaticoActivo 
                      ? '#fff' 
                      : (darkMode ? '#D1D5DB' : '#1976d2'),
                    borderColor: darkMode ? '#D1D5DB' : '#1976d2',
                    fontSize: '0.75rem',
                    minWidth: '140px',
                    '&:hover': {
                      backgroundColor: calculoAutomaticoActivo 
                        ? (darkMode ? '#9CA3AF' : '#1565c0')
                        : (darkMode ? 'rgba(156, 163, 175, 0.1)' : 'rgba(25, 118, 210, 0.1)')
                    }
                  }}
                >
                  {calculoAutomaticoActivo ? '🤖 Auto-cálculo ON' : '✋ Manual'}
                </Button>
                
                {!calculoAutomaticoActivo && datosEdicion.fechaCirculacion && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                       const fechasCalculadas = calcularFechasAutomaticas(datosEdicion.fechaCirculacion, datosEdicion.periodicidad || 30);
                       setDatosEdicion({
                         ...datosEdicion,
                         fechaRecoleccion: fechasCalculadas.fechaRecoleccion,
                         fechaCierre: fechasCalculadas.fechaCierre
                       });
                     }}
                    sx={{
                      color: darkMode ? '#ffa726' : '#f57c00',
                      borderColor: darkMode ? '#ffa726' : '#f57c00',
                      fontSize: '0.75rem',
                      minWidth: '140px',
                      '&:hover': {
                        backgroundColor: darkMode ? 'rgba(255, 167, 38, 0.1)' : 'rgba(245, 124, 0, 0.1)',
                        borderColor: darkMode ? '#ff9800' : '#ef6c00'
                      }
                    }}
                  >
                    ⚡ Calcular Fechas
                  </Button>
                )}
              </Box>
            </Box>
          </Box>
          
          <Grid container spacing={2}>
            {/* Primera fila - Información básica */}
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Número de Edición"
                type="text"
                value={datosEdicion.numeroEdicion}
                onChange={(e) => setDatosEdicion({...datosEdicion, numeroEdicion: e.target.value})}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: darkMode ? '#2D3748' : '#f8fafc',
                    color: darkMode ? '#fff' : '#1a202c',
                    minHeight: '56px',
                    '& fieldset': {
                      borderColor: darkMode ? '#4a5568' : '#e2e8f0',
                    },
                    '&:hover fieldset': {
                      borderColor: darkMode ? '#9CA3AF' : '#000',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: darkMode ? '#9CA3AF' : '#000',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: darkMode ? '#a0aec0' : '#64748b',
                    fontSize: '0.95rem',
                    fontWeight: 500,
                  }
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Periodicidad (días)"
                type="number"
                value={datosEdicion.periodicidad}
                onChange={(e) => {
                  const nuevaPeriodicidad = parseInt(e.target.value) || 0;
                  
                  // Si hay fecha de circulación y el cálculo automático está activado, recalcular las fechas
                  if (calculoAutomaticoActivo && datosEdicion.fechaCirculacion && nuevaPeriodicidad > 0) {
                    const fechasCalculadas = calcularFechasAutomaticas(datosEdicion.fechaCirculacion, nuevaPeriodicidad);
                    setDatosEdicion({
                      ...datosEdicion, 
                      periodicidad: nuevaPeriodicidad,
                      fechaRecoleccion: fechasCalculadas.fechaRecoleccion,
                      fechaCierre: fechasCalculadas.fechaCierre
                    });
                  } else {
                    setDatosEdicion({...datosEdicion, periodicidad: nuevaPeriodicidad});
                  }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: darkMode ? '#2D3748' : '#f8fafc',
                    color: darkMode ? '#fff' : '#1a202c',
                    minHeight: '56px',
                    '& fieldset': {
                      borderColor: darkMode ? '#4a5568' : '#e2e8f0',
                    },
                    '&:hover fieldset': {
                      borderColor: darkMode ? '#9CA3AF' : '#000',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: darkMode ? '#9CA3AF' : '#000',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: darkMode ? '#a0aec0' : '#64748b',
                    fontSize: '0.95rem',
                    fontWeight: 500,
                  }
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={6} lg={4}>
              <CustomDatePicker
                label="Fecha Circulación"
                value={datosEdicion.fechaCirculacion}
                onChange={(nuevaFechaCirculacion) => {
                  // Auto-calcular las fechas solo si el cálculo automático está activado
                  if (calculoAutomaticoActivo && nuevaFechaCirculacion) {
                    const fechasCalculadas = calcularFechasAutomaticas(nuevaFechaCirculacion, datosEdicion.periodicidad || 30);
                    setDatosEdicion({
                      ...datosEdicion, 
                      fechaCirculacion: nuevaFechaCirculacion,
                      fechaRecoleccion: fechasCalculadas.fechaRecoleccion,
                      fechaCierre: fechasCalculadas.fechaCierre
                    });
                  } else {
                    setDatosEdicion({...datosEdicion, fechaCirculacion: nuevaFechaCirculacion});
                  }
                }}
                darkMode={darkMode}
                placeholder="Seleccionar fecha de circulación"
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={6} lg={4}>
              <CustomDatePicker
                label="Fecha Recolección"
                value={datosEdicion.fechaRecoleccion}
                onChange={(value) => setDatosEdicion({...datosEdicion, fechaRecoleccion: value})}
                darkMode={darkMode}
                placeholder="Seleccionar fecha de recolección"
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={6} lg={4}>
              <CustomDatePicker
                label="Fecha Generación"
                value={datosEdicion.fechaGeneracion}
                onChange={(value) => setDatosEdicion({...datosEdicion, fechaGeneracion: value})}
                darkMode={darkMode}
                placeholder="Seleccionar fecha de generación"
              />
            </Grid>
            
            {/* Segunda fila - Fechas auto-calculadas */}
            <Grid item xs={12} sm={6} md={6} lg={4}>
              <CustomDatePicker
                label="Fecha Cierre Ventas"
                value={datosEdicion.fechaCierre}
                onChange={(value) => setDatosEdicion({...datosEdicion, fechaCierre: value})}
                darkMode={darkMode}
                placeholder="Seleccionar fecha de cierre"
              />
            </Grid>
            
            {/* Espacios vacíos para mantener la estructura de 3 columnas */}
            <Grid item xs={12} sm={6} md={4}></Grid>
            <Grid item xs={12} sm={6} md={4}></Grid>
            
            {/* Tercera fila - Estado */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Estado (Se actualiza automáticamente)"
                value={datosEdicion.estado}
                onChange={(e) => setDatosEdicion({...datosEdicion, estado: e.target.value})}
                SelectProps={{
                  native: true,
                }}
                disabled
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: darkMode ? '#2D3748' : '#f8fafc',
                    color: darkMode ? '#fff' : '#1a202c',
                    minHeight: '56px',
                    '& fieldset': {
                      borderColor: darkMode ? '#4a5568' : '#e2e8f0',
                    },
                    '&:hover fieldset': {
                      borderColor: darkMode ? '#9CA3AF' : '#000',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: darkMode ? '#9CA3AF' : '#000',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: darkMode ? '#a0aec0' : '#64748b',
                    fontSize: '0.95rem',
                    fontWeight: 500,
                  }
                }}
              >
                <option value="Sin Programar">Sin Programar</option>
                <option value="Programada">Programada</option>
                <option value="Circulando">Circulando</option>
                <option value="Recolección Vencida">Recolección Vencida</option>
                <option value="Generando Reportes">Generando Reportes</option>
                <option value="Pendiente Cierre">Pendiente Cierre</option>
                <option value="Cierre Vencido">Cierre Vencido</option>
                <option value="Cierre Extemporáneo">Cierre Extemporáneo</option>
                <option value="Esperando Pago">Esperando Pago</option>
                <option value="Pago Vencido">Pago Vencido</option>
                <option value="Finalizada">Finalizada</option>
              </TextField>
            </Grid>


          </Grid>
        </DialogContent>
        
        <DialogActions sx={{ 
          p: 3, 
          borderTop: `1px solid ${darkMode ? '#4a5568' : '#e2e8f0'}`,
          gap: 2
        }}>
          <Button
            onClick={cancelarEdicion}
            startIcon={<CancelIcon />}
            sx={{
              color: darkMode ? '#a0aec0' : '#64748b',
              '&:hover': {
                backgroundColor: darkMode ? 'rgba(160, 174, 192, 0.1)' : 'rgba(100, 116, 139, 0.1)',
              }
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={guardarCambios}
            variant="contained"
            startIcon={<SaveIcon />}
            sx={{
              background: darkMode 
                ? 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)'
                : 'linear-gradient(135deg, #000 0%, #333 100%)',
              '&:hover': {
                background: darkMode 
                  ? 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)'
                  : 'linear-gradient(135deg, #333 0%, #111 100%)',
              }
            }}
          >
            {modoCreacion ? 'Crear Edición' : 'Guardar Cambios'}
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </Box>
  );
};

export default CierreVentas;
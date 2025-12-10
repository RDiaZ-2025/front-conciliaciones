import React from "react";
import { 
  Box, 
  Button, 
  Typography, 
  Container,
  Paper,
  Card,
  CardContent,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Chip
} from "@mui/material";
import { 
  AdminPanelSettings as AdminIcon, 
  Upload as UploadIcon,
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  FileDownload as FileDownloadIcon
} from "@mui/icons-material";
import { useAuth } from '../../contexts/AuthContext';
import { PERMISSIONS } from '../../constants/auth';
import DarkModeToggle from "../../components/DarkModeToggle";
import { useDashboardGeneral } from './useDashboardGeneral';

const years = [2023, 2024, 2025];
const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default function DashboardGeneral({ darkMode, setDarkMode, onBack, onGoToAdmin, onGoToUpload }) {
  const { hasPermission } = useAuth();
  const {
    state,
    data,
    desviacion,
    desviacionPorc,
    historicoFiltrado,
    maxY,
    setSelectedYear,
    setSelectedMonth,
    setTipoSeguimiento,
    setExpandedCategoria,
    setTooltip,
    exportToCSV
  } = useDashboardGeneral({ darkMode, setDarkMode, onBack, onGoToAdmin, onGoToUpload });

  const width = 900;
  const height = 220;
  
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(v => height - v * height);
  const yLabels = [0, 0.25, 0.5, 0.75, 1].map(v => `$${Math.round(maxY * v).toLocaleString()}`);
  const yPositions = yTicks;
  
  const getLinePoints = (arr) => {
    const stepX = width / (arr.length - 1);
    return arr.map((v, i) => `${i * stepX},${height - (v / maxY) * height}`).join(" ");
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        bgcolor: 'background.default',
        color: 'text.primary',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        transition: theme => theme.transitions.create(['background-color', 'color'], {
          duration: theme.transitions.duration.standard,
        }),
        position: 'relative',
        p: theme => theme.spacing(0, 3),
        boxSizing: 'border-box'
      }}
    >      
      <Container maxWidth="xl" sx={{ py: theme => theme.spacing(2) }}>
        <Stack direction="row" spacing={4} justifyContent="center" alignItems="center">
          <Paper 
            elevation={2}
            sx={{ 
              p: theme => theme.spacing(0.5, 1.5),
              bgcolor: 'background.paper',
              borderRadius: theme => theme.spacing(1),
              border: theme => `1px solid ${theme.palette.divider}`
            }}
          >
            <ToggleButtonGroup
              value={state.tipoSeguimiento}
              exclusive
              onChange={(event, newValue) => {
                if (newValue !== null) {
                  setTipoSeguimiento(newValue);
                }
              }}
              sx={{ gap: 1 }}
            >
              <ToggleButton 
                value="ingresos"
                sx={{
                  px: theme => theme.spacing(2.25),
                  py: theme => theme.spacing(1),
                  borderRadius: theme => theme.spacing(0.75),
                  fontWeight: theme => theme.typography.fontWeightBold,
                  fontSize: 16,
                  textTransform: 'none',
                  border: 'none',
                  '&.Mui-selected': {
                    bgcolor: 'success.light',
                    color: 'success.dark',
                    '&:hover': {
                      bgcolor: 'success.light'
                    }
                  }
                }}
              >
                Ingresos
              </ToggleButton>
              <ToggleButton 
                value="costos"
                sx={{
                  px: theme => theme.spacing(2.25),
                  py: theme => theme.spacing(1),
                  borderRadius: theme => theme.spacing(0.75),
                  fontWeight: theme => theme.typography.fontWeightBold,
                  fontSize: 16,
                  textTransform: 'none',
                  border: 'none',
                  '&.Mui-selected': {
                    bgcolor: 'error.light',
                    color: 'error.dark',
                    '&:hover': {
                      bgcolor: 'error.light'
                    }
                  }
                }}
              >
                Costos
              </ToggleButton>
              <ToggleButton 
                value="ebitda"
                sx={{
                  px: theme => theme.spacing(2.25),
                  py: theme => theme.spacing(1),
                  borderRadius: theme => theme.spacing(0.75),
                  fontWeight: theme => theme.typography.fontWeightBold,
                  fontSize: 16,
                  textTransform: 'none',
                  border: 'none',
                  '&.Mui-selected': {
                    bgcolor: 'primary.light',
                    color: 'primary.dark',
                    '&:hover': {
                      bgcolor: 'primary.light'
                    }
                  }
                }}
              >
                Ebitda
              </ToggleButton>
            </ToggleButtonGroup>
          </Paper>
          
          <Paper 
            elevation={2}
            sx={{ 
              p: theme => theme.spacing(0.5, 1.5),
              bgcolor: 'background.paper',
              borderRadius: theme => theme.spacing(1),
              border: theme => `1px solid ${theme.palette.divider}`
            }}
          >
            <Stack direction="row" spacing={1}>
              <FormControl size="small">
                <Select
                  value={state.selectedYear}
                  onChange={e => setSelectedYear(Number(e.target.value))}
                  sx={{
                    minWidth: 80,
                    fontWeight: theme => theme.typography.fontWeightBold,
                    fontSize: 16,
                    '& .MuiOutlinedInput-notchedOutline': {
                      border: 'none'
                    }
                  }}
                >
                  {years.map(y => (
                    <MenuItem key={y} value={y}>{y}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small">
                <Select
                  value={state.selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  sx={{
                    minWidth: 80,
                    fontWeight: theme => theme.typography.fontWeightBold,
                    fontSize: 16,
                    '& .MuiOutlinedInput-notchedOutline': {
                      border: 'none'
                    }
                  }}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {months.map(m => (
                    <MenuItem key={m} value={m}>{m}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Paper>
          
          {hasPermission(PERMISSIONS.DOCUMENT_UPLOAD) && (
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={onGoToUpload}
              sx={{
                color: 'text.primary',
                borderColor: 'primary.main',
                bgcolor: 'action.hover',
                borderRadius: theme => theme.spacing(1),
                px: theme => theme.spacing(2.5),
                py: theme => theme.spacing(1),
                fontWeight: theme => theme.typography.fontWeightSemiBold,
                textTransform: 'none',
                boxShadow: theme => theme.shadows[2],
                transition: theme => theme.transitions.create(['background-color', 'transform', 'box-shadow'], {
                  duration: theme.transitions.duration.short,
                }),
                '&:hover': {
                  bgcolor: 'action.selected',
                  transform: 'translateY(-2px)',
                  boxShadow: theme => theme.shadows[4]
                }
              }}
            >
              Cargar
            </Button>
          )}
          
          {hasPermission(PERMISSIONS.ADMIN_PANEL) && (
            <Button
              variant="outlined"
              startIcon={<AdminIcon />}
              onClick={onGoToAdmin}
              sx={{
                color: 'text.primary',
                borderColor: 'primary.main',
                bgcolor: 'action.hover',
                borderRadius: theme => theme.spacing(1),
                px: theme => theme.spacing(2.5),
                py: theme => theme.spacing(1),
                fontWeight: theme => theme.typography.fontWeightSemiBold,
                textTransform: 'none',
                boxShadow: theme => theme.shadows[2],
                transition: theme => theme.transitions.create(['background-color', 'transform', 'box-shadow'], {
                  duration: theme.transitions.duration.short,
                }),
                '&:hover': {
                  bgcolor: 'action.selected',
                  transform: 'translateY(-2px)',
                  boxShadow: theme => theme.shadows[4]
                }
              }}
            >
              Admin
            </Button>
          )}
        </Stack>
      </Container>
      
      <Container maxWidth="xl" sx={{ mb: 5 }}>
        <Paper 
          elevation={3}
          sx={{ 
            borderRadius: theme => theme.spacing(2.25),
            border: theme => `1px solid ${theme.palette.divider}`,
            p: theme => theme.spacing(4.5),
            position: 'relative'
          }}
        >
          <Typography 
            variant="h5" 
            sx={{ 
              fontWeight: theme => theme.typography.fontWeightBold,
              color: 'text.primary',
              mb: theme => theme.spacing(2.25)
            }}
          >
            Tendencia anual
          </Typography>
        <svg width={width} height={height + 60} style={{ overflow: "visible" }}>
          <defs></defs>
          <line x1={100} y1={0} x2={100} y2={height} stroke={darkMode ? "#444" : "#ddd"} strokeWidth={1} />
          <line x1={100} y1={height} x2={width - 20} y2={height} stroke={darkMode ? "#444" : "#ddd"} strokeWidth={1} />
          {yTicks.map((y, i) => (
            <line key={i} x1={100} y1={y} x2={width - 20} y2={y} stroke={darkMode ? "#333" : "#f0f0f0"} strokeDasharray="2 2" />
          ))}
          {yLabels.map((label, i) => (
            <text key={i} x={95} y={yPositions[i] + 5} fontSize={12} fill={darkMode ? "#888" : "#666"} textAnchor="end">{label}</text>
          ))}
          {historicoFiltrado.map((h, i) => {
            const groupWidth = 38;
            const barWidth = 10;
            const stepX = historicoFiltrado.length > 1 ? (width - 140) / (historicoFiltrado.length - 1) : 0;
            const x = historicoFiltrado.length === 1 ? width / 2 : 120 + i * stepX;
            return (
              <g key={h.mes}>
                <rect 
                  x={x - barWidth - 6} 
                  y={height - (h.presupuestado / maxY) * height} 
                  width={barWidth} 
                  height={(h.presupuestado / maxY) * height} 
                  fill={darkMode ? "#2563eb" : "#1976d2"} 
                  rx={4}
                  onMouseEnter={(e) => setTooltip({
                    x: e.clientX,
                    y: e.clientY,
                    content: `${h.mes} - Presupuestado: $${h.presupuestado.toLocaleString()}`
                  })}
                  onMouseLeave={() => setTooltip(null)}
                  style={{ cursor: "pointer" }}
                />
                <rect 
                  x={x + 6} 
                  y={height - (h.ejecutado / maxY) * height} 
                  width={barWidth} 
                  height={(h.ejecutado / maxY) * height} 
                  fill={darkMode ? "#22c55e" : "#43a047"} 
                  rx={4}
                  onMouseEnter={(e) => setTooltip({
                    x: e.clientX,
                    y: e.clientY,
                    content: `${h.mes} - Ejecutado: $${h.ejecutado.toLocaleString()}`
                  })}
                  onMouseLeave={() => setTooltip(null)}
                  style={{ cursor: "pointer" }}
                />
                <circle 
                  cx={x} 
                  cy={height - ((h.ejecutado - h.presupuestado + h.presupuestado) / maxY) * height} 
                  r={6} 
                  fill="#ef4444" 
                  stroke="#fff" 
                  strokeWidth={2}
                  onMouseEnter={(e) => setTooltip({
                    x: e.clientX,
                    y: e.clientY,
                    content: `${h.mes} - Desviación: $${(h.ejecutado - h.presupuestado).toLocaleString()}`
                  })}
                  onMouseLeave={() => setTooltip(null)}
                  style={{ cursor: "pointer" }}
                />
              </g>
            );
          })}
          <polyline points={historicoFiltrado.map((h, i) => {
            const stepX = historicoFiltrado.length > 1 ? (width - 140) / (historicoFiltrado.length - 1) : 0;
            const x = historicoFiltrado.length === 1 ? width / 2 : 120 + i * stepX;
            const y = height - ((h.ejecutado - h.presupuestado + h.presupuestado) / maxY) * height;
            return `${x},${y}`;
          }).join(' ')} fill="none" stroke="#ef4444" strokeWidth={2} />
          {historicoFiltrado.map((h, i) => {
            const stepX = historicoFiltrado.length > 1 ? (width - 140) / (historicoFiltrado.length - 1) : 0;
            const x = historicoFiltrado.length === 1 ? width / 2 : 120 + i * stepX;
            return (
              <text key={h.mes} x={x} y={height + 24} textAnchor="middle" fontSize={14} fill={darkMode ? "#888" : "#666"}>{h.mes}</text>
            );
          })}
        </svg>
        
          {state.tooltip && (
            <Paper
              elevation={4}
              sx={{
                position: 'fixed',
                left: state.tooltip.x + 10,
                top: state.tooltip.y - 10,
                bgcolor: 'background.paper',
                border: theme => `1px solid ${theme.palette.divider}`,
                borderRadius: theme => theme.spacing(0.75),
                p: theme => theme.spacing(1, 1.5),
                fontSize: 14,
                color: 'text.primary',
                boxShadow: theme => theme.shadows[8],
                zIndex: 1000,
                pointerEvents: 'none',
                whiteSpace: 'nowrap'
              }}
            >
              {state.tooltip.content}
            </Paper>
          )}
        </Paper>
      </Container>
      
      <Container maxWidth="xl" sx={{ mb: 5 }}>
        <Paper 
          elevation={3}
          sx={{ 
            borderRadius: theme => theme.spacing(2.25),
            border: theme => `1px solid ${theme.palette.divider}`,
            p: theme => theme.spacing(4.5)
          }}
        >
          <Typography 
            variant="h5" 
            sx={{ 
              fontWeight: theme => theme.typography.fontWeightBold,
              color: 'error.main',
              mb: theme => theme.spacing(2.25)
            }}
          >
            Desglose por categorías
          </Typography>
          <TableContainer>
            <Table sx={{ fontSize: 18 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell 
                    sx={{ 
                      textAlign: 'left', 
                      p: theme => theme.spacing(1.5),
                      color: 'text.primary',
                      fontWeight: theme => theme.typography.fontWeightBold
                    }}
                  >
                    Categoría
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      textAlign: 'right', 
                      p: theme => theme.spacing(1.5),
                      color: 'text.primary',
                      fontWeight: theme => theme.typography.fontWeightBold
                    }}
                  >
                    Presupuestado
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      textAlign: 'right', 
                      p: theme => theme.spacing(1.5),
                      color: 'text.primary',
                      fontWeight: theme => theme.typography.fontWeightBold
                    }}
                  >
                    Ejecutado
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      textAlign: 'right', 
                      p: theme => theme.spacing(1.5),
                      color: 'text.primary',
                      fontWeight: theme => theme.typography.fontWeightBold
                    }}
                  >
                    Desviación
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(state.selectedCategoria ? data.categorias.filter(cat => cat.nombre === state.selectedCategoria) : data.categorias).map(cat => {
                  const dev = cat.ejecutado - cat.presupuestado;
                  const isExpanded = state.expandedCategoria === cat.nombre;
                  return [
                    <TableRow 
                      key={cat.nombre} 
                      sx={{ 
                        borderBottom: theme => `1px solid ${theme.palette.divider}`,
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: 'action.hover'
                        }
                      }} 
                      onClick={() => cat.subcategorias ? setExpandedCategoria(isExpanded ? null : cat.nombre) : null}
                    >
                      <TableCell 
                        sx={{ 
                          p: theme => theme.spacing(1.5),
                          color: 'text.primary',
                          fontWeight: theme => theme.typography.fontWeightBold,
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <Box 
                          component="span" 
                          sx={{ 
                            mr: 1,
                            fontSize: 18,
                            color: 'text.secondary',
                            display: 'inline-block',
                            transition: theme => theme.transitions.create('transform', {
                              duration: theme.transitions.duration.short,
                            })
                          }}
                        >
                          {cat.subcategorias ? (isExpanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />) : <ChevronRightIcon fontSize="small" />}
                        </Box>
                        {cat.nombre}
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          p: theme => theme.spacing(1.5),
                          textAlign: 'right',
                          color: 'error.main',
                          fontWeight: theme => theme.typography.fontWeightBold
                        }}
                      >
                        ${cat.presupuestado.toLocaleString()}
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          p: theme => theme.spacing(1.5),
                          textAlign: 'right',
                          color: 'success.main',
                          fontWeight: theme => theme.typography.fontWeightBold
                        }}
                      >
                        ${cat.ejecutado.toLocaleString()}
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          p: theme => theme.spacing(1.5),
                          textAlign: 'right',
                          color: dev < 0 ? 'error.main' : 'success.main',
                          fontWeight: theme => theme.typography.fontWeightBold
                        }}
                      >
                        {dev > 0 ? "+" : ""}${dev.toLocaleString()}
                      </TableCell>
                    </TableRow>,
                    isExpanded && cat.subcategorias && cat.subcategorias.map(sub => {
                      const subDev = sub.ejecutado - sub.presupuestado;
                      return (
                        <TableRow 
                          key={cat.nombre + "-sub-" + sub.nombre} 
                          sx={{ borderBottom: theme => `1px solid ${theme.palette.divider}` }}
                        >
                          <TableCell 
                            sx={{ 
                              p: theme => theme.spacing(1.5, 1.5, 1.5, 4.5),
                              color: 'text.secondary'
                            }}
                          >
                            ↳ {sub.nombre}
                          </TableCell>
                          <TableCell 
                            sx={{ 
                              p: theme => theme.spacing(1.5),
                              textAlign: 'right',
                              color: 'error.main'
                            }}
                          >
                            ${sub.presupuestado.toLocaleString()}
                          </TableCell>
                          <TableCell 
                            sx={{ 
                              p: theme => theme.spacing(1.5),
                              textAlign: 'right',
                              color: 'success.main'
                            }}
                          >
                            ${sub.ejecutado.toLocaleString()}
                          </TableCell>
                          <TableCell 
                            sx={{ 
                              p: theme => theme.spacing(1.5),
                              textAlign: 'right',
                              color: subDev < 0 ? 'error.main' : 'success.main'
                            }}
                          >
                            {subDev > 0 ? "+" : ""}${subDev.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ];
                })}
              </TableBody>
            </Table>
          </TableContainer>
          
          <Box sx={{ mt: theme => theme.spacing(2.5), textAlign: 'center' }}>
            <Button 
              variant="contained"
              startIcon={<FileDownloadIcon />}
              onClick={exportToCSV}
              sx={{
                px: theme => theme.spacing(3),
                py: theme => theme.spacing(1.5),
                fontWeight: theme => theme.typography.fontWeightSemiBold,
                fontSize: 16,
                borderRadius: theme => theme.spacing(1),
                textTransform: 'none'
              }}
            >
              Exportar a CSV
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
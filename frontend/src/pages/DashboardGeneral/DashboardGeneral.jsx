import React from "react";
import { Box, Button, Typography } from "@mui/material";
import { AdminPanelSettings as AdminIcon, Upload as UploadIcon } from "@mui/icons-material";
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
      <div style={{ minHeight: "100vh", width: "100vw", background: darkMode ? "#23232b" : "linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)", color: darkMode ? "#E6EDF3" : "#181C32", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", fontFamily: "'Inter', 'Roboto', Arial, sans-serif", transition: "background 0.3s, color 0.3s", position: "relative", padding: "0 24px", boxSizing: "border-box" }}>
      <div style={{ position: "absolute", top: 16, right: 24, zIndex: 1000, display: "flex", alignItems: "center", gap: "12px" }}>
         {hasPermission(PERMISSIONS.DOCUMENT_UPLOAD) && (
           <Button
             variant="outlined"
             startIcon={<UploadIcon />}
             onClick={onGoToUpload}
             sx={{
               color: darkMode ? '#fff' : '#181C32',
               borderColor: darkMode ? '#E60026' : '#181C32',
               background: darkMode ? 'rgba(230, 0, 38, 0.05)' : 'rgba(255, 255, 255, 0.9)',
               backdropFilter: 'blur(10px)',
               borderRadius: 2,
               px: 2.5,
               py: 1,
               fontWeight: 600,
               textTransform: 'none',
               boxShadow: darkMode ? '0 4px 12px rgba(230, 0, 38, 0.15)' : '0 4px 12px rgba(24, 28, 50, 0.1)',
               transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
               '&:hover': {
                 backgroundColor: darkMode ? 'rgba(230, 0, 38, 0.15)' : 'rgba(24, 28, 50, 0.05)',
                 borderColor: darkMode ? '#E60026' : '#181C32',
                 transform: 'translateY(-2px)',
                 boxShadow: darkMode ? '0 8px 24px rgba(230, 0, 38, 0.25)' : '0 8px 24px rgba(24, 28, 50, 0.15)'
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
               color: darkMode ? '#fff' : '#181C32',
               borderColor: darkMode ? '#E60026' : '#181C32',
               background: darkMode ? 'rgba(230, 0, 38, 0.05)' : 'rgba(255, 255, 255, 0.9)',
               backdropFilter: 'blur(10px)',
               borderRadius: 2,
               px: 2.5,
               py: 1,
               fontWeight: 600,
               textTransform: 'none',
               boxShadow: darkMode ? '0 4px 12px rgba(230, 0, 38, 0.15)' : '0 4px 12px rgba(24, 28, 50, 0.1)',
               transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
               '&:hover': {
                 backgroundColor: darkMode ? 'rgba(230, 0, 38, 0.15)' : 'rgba(24, 28, 50, 0.05)',
                 borderColor: darkMode ? '#E60026' : '#181C32',
                 transform: 'translateY(-2px)',
                 boxShadow: darkMode ? '0 8px 24px rgba(230, 0, 38, 0.25)' : '0 8px 24px rgba(24, 28, 50, 0.15)'
               }
             }}
           >
             Admin
           </Button>
         )}
        
        <DarkModeToggle 
          darkMode={darkMode} 
          setDarkMode={setDarkMode}
          onLogoClick={onBack}
        />
      </div>
      
      <div style={{ width: '100%', maxWidth: '1400px', margin: 0, padding: "40px 0 24px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 32 }}>
        <div style={{ display: "flex", alignItems: "center", background: darkMode ? "#181C32" : "#fff", borderRadius: 8, boxShadow: darkMode ? "0 2px 8px #0008" : "0 2px 8px #1976d220", padding: "4px 12px", gap: 8, border: darkMode ? "1.5px solid #4A5568" : "none" }}>
          <button onClick={() => setTipoSeguimiento("ingresos")}
            style={{ padding: "8px 18px", borderRadius: 6, border: state.tipoSeguimiento === "ingresos" ? "2px solid #43a047" : "1px solid #bdbdbd", background: state.tipoSeguimiento === "ingresos" ? (darkMode ? "#1E2A3A" : "#e8f5e9") : (darkMode ? "#181C32" : "#f0f0f0"), color: state.tipoSeguimiento === "ingresos" ? "#43a047" : (darkMode ? "#E6EDF3" : "#333"), fontWeight: 700, fontSize: 16, cursor: "pointer", transition: "all 0.2s" }}>Ingresos</button>
          <button onClick={() => setTipoSeguimiento("costos")}
            style={{ padding: "8px 18px", borderRadius: 6, border: state.tipoSeguimiento === "costos" ? "2px solid #e53935" : "1px solid #bdbdbd", background: state.tipoSeguimiento === "costos" ? (darkMode ? "#1E2A3A" : "#ffebee") : (darkMode ? "#181C32" : "#f0f0f0"), color: state.tipoSeguimiento === "costos" ? "#e53935" : (darkMode ? "#E6EDF3" : "#333"), fontWeight: 700, fontSize: 16, cursor: "pointer", transition: "all 0.2s" }}>Costos</button>
          <button onClick={() => setTipoSeguimiento("ebitda")}
            style={{ padding: "8px 18px", borderRadius: 6, border: state.tipoSeguimiento === "ebitda" ? "2px solid #1976d2" : "1px solid #bdbdbd", background: state.tipoSeguimiento === "ebitda" ? (darkMode ? "#1E2A3A" : "#e3eafc") : (darkMode ? "#181C32" : "#f0f0f0"), color: state.tipoSeguimiento === "ebitda" ? "#1976d2" : (darkMode ? "#E6EDF3" : "#333"), fontWeight: 700, fontSize: 16, cursor: "pointer", transition: "all 0.2s" }}>Ebitda</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", background: darkMode ? "#181C32" : "#fff", borderRadius: 8, boxShadow: darkMode ? "0 2px 8px #0008" : "0 2px 8px #1976d220", padding: "4px 12px", gap: 8, border: darkMode ? "1.5px solid #4A5568" : "none" }}>
          <select value={state.selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} style={{ padding: "8px 18px", borderRadius: 6, border: "1px solid #bdbdbd", background: darkMode ? "#181C32" : "#f0f0f0", color: darkMode ? "#E6EDF3" : "#333", fontWeight: 700, fontSize: 16, cursor: "pointer", transition: "all 0.2s" }}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={state.selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={{ padding: "8px 18px", borderRadius: 6, border: "1px solid #bdbdbd", background: darkMode ? "#181C32" : "#f0f0f0", color: darkMode ? "#E6EDF3" : "#333", fontWeight: 700, fontSize: 16, cursor: "pointer", transition: "all 0.2s" }}>
            <option value="">Todos</option>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>
      
      <div style={{ width: "100%", maxWidth: "1400px", margin: 0, display: "flex", gap: 36, justifyContent: "center", alignItems: "stretch", marginBottom: 40 }}>
        <div style={{ flex: 1, background: darkMode ? "#4A5568" : "#fff", borderRadius: 18, boxShadow: darkMode ? "0 2px 12px #0008" : "0 2px 12px #0001", padding: 32, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: darkMode ? "1.5px solid #4A5568" : "none" }}>
          <div style={{ fontWeight: 700, fontSize: 18, color: "#e53935", marginBottom: 6 }}>Presupuestado</div>
          <div style={{ fontSize: 38, fontWeight: 900, color: "#e53935", letterSpacing: 1 }}>${data.presupuestado.toLocaleString()}</div>
        </div>
        <div style={{ flex: 1, background: darkMode ? "#4A5568" : "#fff", borderRadius: 18, boxShadow: darkMode ? "0 2px 12px #0008" : "0 2px 12px #0001", padding: 32, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: darkMode ? "1.5px solid #4A5568" : "none" }}>
          <div style={{ fontWeight: 700, fontSize: 18, color: "#43a047", marginBottom: 6 }}>Ejecutado</div>
          <div style={{ fontSize: 38, fontWeight: 900, color: "#43a047", letterSpacing: 1 }}>${data.ejecutado.toLocaleString()}</div>
        </div>
        <div style={{ flex: 1, background: darkMode ? "#4A5568" : "#fff", borderRadius: 18, boxShadow: darkMode ? "0 2px 12px #0008" : "0 2px 12px #0001", padding: 32, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: darkMode ? "1.5px solid #4A5568" : "none" }}>
          <div style={{ fontWeight: 700, fontSize: 18, color: darkMode ? "#fff" : "#000", marginBottom: 6 }}>Desviación</div>
          <div style={{ fontSize: 38, fontWeight: 900, color: desviacionPorc < 0 ? "#e53935" : "#43a047", letterSpacing: 1 }}>{desviacionPorc > 0 ? "+" : ""}{desviacionPorc.toFixed(1)}%</div>
          <div style={{ fontSize: 20, color: "#888", marginTop: 4 }}>{desviacion > 0 ? "+" : ""}${desviacion.toLocaleString()}</div>
        </div>
      </div>
      
      <div style={{ width: "100%", maxWidth: "1400px", margin: 0, background: darkMode ? "#4A5568" : "#fff", borderRadius: 18, boxShadow: darkMode ? "0 2px 12px #000A" : "0 2px 12px #0001", padding: 36, marginBottom: 40, border: darkMode ? "1.5px solid #4A5568" : "none", transition: "background 0.3s, color 0.3s, border 0.3s", position: "relative" }}>
        <div style={{ fontWeight: 700, fontSize: 22, color: darkMode ? "#fff" : "#000", marginBottom: 18 }}>Tendencia anual</div>
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
          <div style={{
            position: "fixed",
            left: state.tooltip.x + 10,
            top: state.tooltip.y - 10,
            background: darkMode ? "#1a1a1a" : "#fff",
            border: `1px solid ${darkMode ? "#444" : "#ddd"}`,
            borderRadius: 6,
            padding: "8px 12px",
            fontSize: 14,
            color: darkMode ? "#fff" : "#333",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 1000,
            pointerEvents: "none",
            whiteSpace: "nowrap"
          }}>
            {state.tooltip.content}
          </div>
        )}
      </div>
      
      <div style={{ width: "100%", maxWidth: "1400px", margin: 0, background: darkMode ? "#4A5568" : "#fff", borderRadius: 18, boxShadow: darkMode ? "0 2px 12px #0008" : "0 2px 12px #0001", padding: 36, marginBottom: 40, border: darkMode ? "1.5px solid #4A5568" : "none", transition: "background 0.3s, color 0.3s, border 0.3s" }}>
        <div style={{ fontWeight: 700, fontSize: 22, color: darkMode ? "#E60026" : "#e53935", marginBottom: 18 }}>Desglose por categorías</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 18 }}>
          <thead>
            <tr style={{ background: darkMode ? "#4A5568" : "#f8fafc" }}>
              <th style={{ textAlign: "left", padding: 12, color: darkMode ? "#E6EDF3" : undefined }}>Categoría</th>
              <th style={{ textAlign: "right", padding: 12, color: darkMode ? "#E6EDF3" : undefined }}>Presupuestado</th>
              <th style={{ textAlign: "right", padding: 12, color: darkMode ? "#E6EDF3" : undefined }}>Ejecutado</th>
              <th style={{ textAlign: "right", padding: 12, color: darkMode ? "#E6EDF3" : undefined }}>Desviación</th>
            </tr>
          </thead>
          <tbody>
            {(state.selectedCategoria ? data.categorias.filter(cat => cat.nombre === state.selectedCategoria) : data.categorias).map(cat => {
              const dev = cat.ejecutado - cat.presupuestado;
              const isExpanded = state.expandedCategoria === cat.nombre;
              return [
                <tr key={cat.nombre} style={{ borderBottom: darkMode ? "1px solid #4A5568" : "1px solid #f0f0f0", background: darkMode ? "#4A5568" : undefined, cursor: "pointer" }} onClick={() => cat.subcategorias ? setExpandedCategoria(isExpanded ? null : cat.nombre) : null}>
                  <td style={{ padding: 12, color: darkMode ? "#E6EDF3" : undefined, fontWeight: 700, display: "flex", alignItems: "center" }}>
                    <span style={{ marginRight: 8, fontSize: 18, verticalAlign: "middle", color: darkMode ? "#E6EDF3" : "#333", display: "inline-block", transition: "transform 0.2s" }}>
                      {cat.subcategorias ? (isExpanded ? "▼" : "▶") : "▶"}
                    </span>
                    {cat.nombre}
                  </td>
                  <td style={{ padding: 12, textAlign: "right", color: darkMode ? "#E60026" : "#e53935", fontWeight: 700 }}>${cat.presupuestado.toLocaleString()}</td>
                  <td style={{ padding: 12, textAlign: "right", color: darkMode ? "#43FF8E" : "#43a047", fontWeight: 700 }}>${cat.ejecutado.toLocaleString()}</td>
                  <td style={{ padding: 12, textAlign: "right", color: dev < 0 ? (darkMode ? "#E60026" : "#e53935") : (darkMode ? "#43FF8E" : "#43a047"), fontWeight: 700 }}>{dev > 0 ? "+" : ""}${dev.toLocaleString()}</td>
                </tr>,
                isExpanded && cat.subcategorias && cat.subcategorias.map(sub => {
                  const subDev = sub.ejecutado - sub.presupuestado;
                  return (
                    <tr key={cat.nombre + "-sub-" + sub.nombre} style={{ borderBottom: darkMode ? "1px solid #4A5568" : "1px solid #f0f0f0" }}>
                      <td style={{ padding: "12px 12px 12px 36px", color: darkMode ? "#B0BEC5" : "#555" }}>↳ {sub.nombre}</td>
                      <td style={{ padding: 12, textAlign: "right", color: darkMode ? "#E60026" : "#e53935" }}>${sub.presupuestado.toLocaleString()}</td>
                      <td style={{ padding: 12, textAlign: "right", color: darkMode ? "#43FF8E" : "#43a047" }}>${sub.ejecutado.toLocaleString()}</td>
                      <td style={{ padding: 12, textAlign: "right", color: subDev < 0 ? (darkMode ? "#E60026" : "#e53935") : (darkMode ? "#43FF8E" : "#43a047") }}>{subDev > 0 ? "+" : ""}${subDev.toLocaleString()}</td>
                    </tr>
                  );
                })
              ];
            })}
          </tbody>
        </table>
        <div style={{ marginTop: 20, textAlign: "center" }}>
          <button onClick={exportToCSV} style={{ padding: "12px 24px", background: darkMode ? "#1976d2" : "#1976d2", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 16 }}>
            Exportar a CSV
          </button>
        </div>
      </div>
    </div>
  );
}
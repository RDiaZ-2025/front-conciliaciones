import React, { useState } from "react";
import DarkModeToggle from "./DarkModeToggle";

// 1. Estructura de datos con subcategorías
const initialData = {
  2023: {
    presupuestado: 950000,
    ejecutado: 1025000,
    categorias: [
      { nombre: "SMS POR SUSCRIPCION", presupuestado: 200000, ejecutado: 210000, subcategorias: [
        { nombre: "Campañas", presupuestado: 120000, ejecutado: 125000 },
        { nombre: "Alertas", presupuestado: 80000, ejecutado: 85000 },
      ] },
      { nombre: "COMERCIAL", presupuestado: 180000, ejecutado: 175000, subcategorias: [
        { nombre: "Ventas", presupuestado: 100000, ejecutado: 95000 },
        { nombre: "Promociones", presupuestado: 80000, ejecutado: 80000 },
      ] },
      { nombre: "REVISTA 15 MINUTOS", presupuestado: 150000, ejecutado: 170000, subcategorias: [
        { nombre: "Edición impresa", presupuestado: 90000, ejecutado: 100000 },
        { nombre: "Edición digital", presupuestado: 60000, ejecutado: 70000 },
      ] },
      { nombre: "PORTAL WEB", presupuestado: 140000, ejecutado: 135000, subcategorias: [
        { nombre: "Publicidad", presupuestado: 80000, ejecutado: 75000 },
        { nombre: "Contenido", presupuestado: 60000, ejecutado: 60000 },
      ] },
      { nombre: "NOTICIERO", presupuestado: 160000, ejecutado: 180000, subcategorias: [
        { nombre: "Producción", presupuestado: 100000, ejecutado: 110000 },
        { nombre: "Distribución", presupuestado: 60000, ejecutado: 70000 },
      ] },
      { nombre: "MOBILEMARKETING", presupuestado: 120000, ejecutado: 115000, subcategorias: [
        { nombre: "SMS", presupuestado: 70000, ejecutado: 65000 },
        { nombre: "Push", presupuestado: 50000, ejecutado: 50000 },
      ] },
    ],
    historico: [
      { mes: "Ene", presupuestado: 70000, ejecutado: 80000 },
      { mes: "Feb", presupuestado: 75000, ejecutado: 78000 },
      { mes: "Mar", presupuestado: 80000, ejecutado: 85000 },
      { mes: "Abr", presupuestado: 85000, ejecutado: 90000 },
      { mes: "May", presupuestado: 90000, ejecutado: 95000 },
      { mes: "Jun", presupuestado: 95000, ejecutado: 100000 },
      { mes: "Jul", presupuestado: 100000, ejecutado: 105000 },
      { mes: "Ago", presupuestado: 105000, ejecutado: 110000 },
      { mes: "Sep", presupuestado: 110000, ejecutado: 115000 },
      { mes: "Oct", presupuestado: 115000, ejecutado: 120000 },
      { mes: "Nov", presupuestado: 120000, ejecutado: 125000 },
      { mes: "Dic", presupuestado: 125000, ejecutado: 128000 },
    ]
  },
  2024: {
    presupuestado: 1100000,
    ejecutado: 1080000,
    categorias: [
      { nombre: "SMS POR SUSCRIPCION", presupuestado: 220000, ejecutado: 215000 },
      { nombre: "COMERCIAL", presupuestado: 200000, ejecutado: 205000 },
      { nombre: "REVISTA 15 MINUTOS", presupuestado: 170000, ejecutado: 168000 },
      { nombre: "PORTAL WEB", presupuestado: 160000, ejecutado: 155000 },
      { nombre: "NOTICIERO", presupuestado: 180000, ejecutado: 182000 },
      { nombre: "MOBILEMARKETING", presupuestado: 150000, ejecutado: 139000 },
    ],
    historico: [
      { mes: "Ene", presupuestado: 80000, ejecutado: 82000 },
      { mes: "Feb", presupuestado: 85000, ejecutado: 83000 },
      { mes: "Mar", presupuestado: 90000, ejecutado: 91000 },
      { mes: "Abr", presupuestado: 95000, ejecutado: 97000 },
      { mes: "May", presupuestado: 100000, ejecutado: 98000 },
      { mes: "Jun", presupuestado: 105000, ejecutado: 104000 },
      { mes: "Jul", presupuestado: 110000, ejecutado: 108000 },
      { mes: "Ago", presupuestado: 115000, ejecutado: 112000 },
      { mes: "Sep", presupuestado: 120000, ejecutado: 118000 },
      { mes: "Oct", presupuestado: 125000, ejecutado: 123000 },
      { mes: "Nov", presupuestado: 130000, ejecutado: 128000 },
      { mes: "Dic", presupuestado: 135000, ejecutado: 134000 },
    ]
  },
  2025: {
    presupuestado: 420000,
    ejecutado: 430000,
    categorias: [
      { nombre: "SMS POR SUSCRIPCION", presupuestado: 70000, ejecutado: 72000, subcategorias: [
        { nombre: "SMS Nacional", presupuestado: 40000, ejecutado: 42000 },
        { nombre: "SMS Internacional", presupuestado: 30000, ejecutado: 30000 }
      ] },
      { nombre: "COMERCIAL", presupuestado: 65000, ejecutado: 67000, subcategorias: [
        { nombre: "TV", presupuestado: 35000, ejecutado: 37000 },
        { nombre: "Radio", presupuestado: 30000, ejecutado: 30000 }
      ] },
      { nombre: "REVISTA 15 MINUTOS", presupuestado: 60000, ejecutado: 61000 },
      { nombre: "PORTAL WEB", presupuestado: 55000, ejecutado: 54000 },
      { nombre: "NOTICIERO", presupuestado: 80000, ejecutado: 82000 },
      { nombre: "MOBILEMARKETING", presupuestado: 90000, ejecutado: 94000 },
    ],
    historico: [
      { mes: "Ene", presupuestado: 35000, ejecutado: 37000 },
      { mes: "Feb", presupuestado: 40000, ejecutado: 41000 },
      { mes: "Mar", presupuestado: 45000, ejecutado: 46000 },
      { mes: "Abr", presupuestado: 50000, ejecutado: 52000 },
      { mes: "May", presupuestado: 55000, ejecutado: 57000 },
      { mes: "Jun", presupuestado: 60000, ejecutado: 61000 },
      { mes: "Jul", presupuestado: 65000, ejecutado: 67000 },
      { mes: "Ago", presupuestado: 70000, ejecutado: 72000 },
      { mes: "Sep", presupuestado: 0, ejecutado: 0 },
      { mes: "Oct", presupuestado: 0, ejecutado: 0 },
      { mes: "Nov", presupuestado: 0, ejecutado: 0 },
      { mes: "Dic", presupuestado: 0, ejecutado: 0 },
    ]
  }
};
const years = [2023, 2024, 2025];
const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default function DashboardGeneral({ darkMode, setDarkMode, onBack }) {
  const [selectedYear, setSelectedYear] = useState(2025);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [tipoSeguimiento, setTipoSeguimiento] = useState("ingresos"); // opciones: ingresos, costos, ebitda
  const [selectedCategoria, setSelectedCategoria] = useState("");
  const [expandedCategoria, setExpandedCategoria] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  
  const data = initialData[selectedYear];

  // Simulación de datos para ingresos y costos (puedes ajustar según tu lógica real)
  const getTipoData = () => {
    if (tipoSeguimiento === "ingresos") {
      return {
        presupuestado: data.presupuestado * 0.6,
        ejecutado: data.ejecutado * 0.6,
        categorias: data.categorias.map(cat => ({ ...cat, presupuestado: cat.presupuestado * 0.6, ejecutado: cat.ejecutado * 0.6 })),
        historico: data.historico.map(h => ({ ...h, presupuestado: h.presupuestado * 0.6, ejecutado: h.ejecutado * 0.6 }))
      };
    } else if (tipoSeguimiento === "costos") {
      return {
        presupuestado: data.presupuestado * 0.4,
        ejecutado: data.ejecutado * 0.4,
        categorias: data.categorias.map(cat => ({ ...cat, presupuestado: cat.presupuestado * 0.4, ejecutado: cat.ejecutado * 0.4 })),
        historico: data.historico.map(h => ({ ...h, presupuestado: h.presupuestado * 0.4, ejecutado: h.ejecutado * 0.4 }))
      };
    }
    return data;
  };
  const tipoData = getTipoData();

  const presupuestado = tipoData.presupuestado;
  const ejecutado = tipoData.ejecutado;
  const desviacion = ejecutado - presupuestado;
  const desviacionPorc = ((ejecutado - presupuestado) / presupuestado) * 100;

  const exportToCSV = () => {
    const rows = [
      ["Categoría", "Presupuestado", "Ejecutado", "Desviación"],
      ...tipoData.categorias.map(cat => [cat.nombre, cat.presupuestado, cat.ejecutado, cat.ejecutado - cat.presupuestado])
    ];
    const csvContent = rows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `presupuesto_categorias_${selectedYear}_${tipoSeguimiento}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const maxY = Math.max(...tipoData.historico.map(h => Math.max(h.presupuestado, h.ejecutado)));
  const width = 900;
  const height = 220;
  
  // Definir variables para la gráfica ANTES del return
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(v => height - v * height);
  const yLabels = [0, 0.25, 0.5, 0.75, 1].map(v => `$${Math.round(maxY * v).toLocaleString()}`);
  const yPositions = yTicks;
  
  const getLinePoints = (arr) => {
    const stepX = width / (arr.length - 1);
    return arr.map((v, i) => `${i * stepX},${height - (v / maxY) * height}`).join(" ");
  };
  const historicoFiltrado = selectedMonth
    ? tipoData.historico.filter(h => h.mes === selectedMonth)
    : tipoData.historico;

  return (
      <div style={{ minHeight: "100vh", width: "100vw", background: darkMode ? "#2D3748" : "linear-gradient(120deg, #f5f7fa 0%, #e3eafc 100%)", color: darkMode ? "#E6EDF3" : "#181C32", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", fontFamily: "'Inter', 'Roboto', Arial, sans-serif", transition: "background 0.3s, color 0.3s", position: "relative" }}>
      {/* DarkModeToggle en la esquina superior derecha */}
      <div style={{ position: "absolute", top: 16, right: 40, zIndex: 1000 }}>
        <DarkModeToggle 
          darkMode={darkMode} 
          setDarkMode={setDarkMode}
          onLogoClick={onBack} // El icono circular rojo manejará el logout
        />
      </div>
      {/* Header */}
      <div style={{ width: "100%", maxWidth: 1400, margin: "0 auto", padding: "40px 0 24px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 32 }}>
        <div style={{ display: "flex", alignItems: "center", background: darkMode ? "#181C32" : "#fff", borderRadius: 8, boxShadow: darkMode ? "0 2px 8px #0008" : "0 2px 8px #1976d220", padding: "4px 12px", gap: 8, border: darkMode ? "1.5px solid #4A5568" : "none" }}>
          <button onClick={() => setTipoSeguimiento("ingresos")}
            style={{ padding: "8px 18px", borderRadius: 6, border: tipoSeguimiento === "ingresos" ? "2px solid #43a047" : "1px solid #bdbdbd", background: tipoSeguimiento === "ingresos" ? (darkMode ? "#1E2A3A" : "#e8f5e9") : (darkMode ? "#181C32" : "#f0f0f0"), color: tipoSeguimiento === "ingresos" ? "#43a047" : (darkMode ? "#E6EDF3" : "#333"), fontWeight: 700, fontSize: 16, cursor: "pointer", transition: "all 0.2s" }}>Ingresos</button>
          <button onClick={() => setTipoSeguimiento("costos")}
            style={{ padding: "8px 18px", borderRadius: 6, border: tipoSeguimiento === "costos" ? "2px solid #e53935" : "1px solid #bdbdbd", background: tipoSeguimiento === "costos" ? (darkMode ? "#1E2A3A" : "#ffebee") : (darkMode ? "#181C32" : "#f0f0f0"), color: tipoSeguimiento === "costos" ? "#e53935" : (darkMode ? "#E6EDF3" : "#333"), fontWeight: 700, fontSize: 16, cursor: "pointer", transition: "all 0.2s" }}>Costos</button>
          <button onClick={() => setTipoSeguimiento("ebitda")}
            style={{ padding: "8px 18px", borderRadius: 6, border: tipoSeguimiento === "ebitda" ? "2px solid #1976d2" : "1px solid #bdbdbd", background: tipoSeguimiento === "ebitda" ? (darkMode ? "#1E2A3A" : "#e3eafc") : (darkMode ? "#181C32" : "#f0f0f0"), color: tipoSeguimiento === "ebitda" ? "#1976d2" : (darkMode ? "#E6EDF3" : "#333"), fontWeight: 700, fontSize: 16, cursor: "pointer", transition: "all 0.2s" }}>Ebitda</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", background: darkMode ? "#181C32" : "#fff", borderRadius: 8, boxShadow: darkMode ? "0 2px 8px #0008" : "0 2px 8px #1976d220", padding: "4px 12px", gap: 8, border: darkMode ? "1.5px solid #4A5568" : "none" }}>
          <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} style={{ padding: "8px 18px", borderRadius: 6, border: "1px solid #bdbdbd", background: darkMode ? "#181C32" : "#f0f0f0", color: darkMode ? "#E6EDF3" : "#333", fontWeight: 700, fontSize: 16, cursor: "pointer", transition: "all 0.2s" }}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={{ padding: "8px 18px", borderRadius: 6, border: "1px solid #bdbdbd", background: darkMode ? "#181C32" : "#f0f0f0", color: darkMode ? "#E6EDF3" : "#333", fontWeight: 700, fontSize: 16, cursor: "pointer", transition: "all 0.2s" }}>
            <option value="">Todos</option>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>
      {/* Indicadores principales */}
      <div style={{ width: "100%", maxWidth: 1400, margin: "0 auto", display: "flex", gap: 36, justifyContent: "center", alignItems: "stretch", marginBottom: 40 }}>
        <div style={{ flex: 1, background: darkMode ? "#4A5568" : "#fff", borderRadius: 18, boxShadow: darkMode ? "0 2px 12px #0008" : "0 2px 12px #0001", padding: 32, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: darkMode ? "1.5px solid #4A5568" : "none" }}>
          <div style={{ fontWeight: 700, fontSize: 18, color: "#e53935", marginBottom: 6 }}>Presupuestado</div>
          <div style={{ fontSize: 38, fontWeight: 900, color: "#e53935", letterSpacing: 1 }}>${presupuestado.toLocaleString()}</div>
        </div>
        <div style={{ flex: 1, background: darkMode ? "#4A5568" : "#fff", borderRadius: 18, boxShadow: darkMode ? "0 2px 12px #0008" : "0 2px 12px #0001", padding: 32, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: darkMode ? "1.5px solid #4A5568" : "none" }}>
          <div style={{ fontWeight: 700, fontSize: 18, color: "#43a047", marginBottom: 6 }}>Ejecutado</div>
          <div style={{ fontSize: 38, fontWeight: 900, color: "#43a047", letterSpacing: 1 }}>${ejecutado.toLocaleString()}</div>
        </div>
        <div style={{ flex: 1, background: darkMode ? "#4A5568" : "#fff", borderRadius: 18, boxShadow: darkMode ? "0 2px 12px #0008" : "0 2px 12px #0001", padding: 32, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: darkMode ? "1.5px solid #4A5568" : "none" }}>
          <div style={{ fontWeight: 700, fontSize: 18, color: darkMode ? "#fff" : "#000", marginBottom: 6 }}>Desviación</div>
          <div style={{ fontSize: 38, fontWeight: 900, color: desviacionPorc < 0 ? "#e53935" : "#43a047", letterSpacing: 1 }}>{desviacionPorc > 0 ? "+" : ""}{desviacionPorc.toFixed(1)}%</div>
          <div style={{ fontSize: 20, color: "#888", marginTop: 4 }}>{desviacion > 0 ? "+" : ""}${desviacion.toLocaleString()}</div>
        </div>
      </div>
      {/* Gráfica de tendencias */}
      <div style={{ width: "100%", maxWidth: 1400, margin: "0 auto", background: darkMode ? "#4A5568" : "#fff", borderRadius: 18, boxShadow: darkMode ? "0 2px 12px #000A" : "0 2px 12px #0001", padding: 36, marginBottom: 40, border: darkMode ? "1.5px solid #4A5568" : "none", transition: "background 0.3s, color 0.3s, border 0.3s", position: "relative" }}>
        <div style={{ fontWeight: 700, fontSize: 22, color: darkMode ? "#fff" : "#000", marginBottom: 18 }}>Tendencia anual</div>
        <svg width={width} height={height + 60} style={{ overflow: "visible" }}>
          <defs>{/* Definiciones de filtros y gradientes si los usas */}</defs>
          {/* Eje Y - Cambiado a gris claro */}
          <line x1={100} y1={0} x2={100} y2={height} stroke={darkMode ? "#444" : "#ddd"} strokeWidth={1} />
          {/* Eje X */}
          <line x1={100} y1={height} x2={width - 20} y2={height} stroke={darkMode ? "#444" : "#ddd"} strokeWidth={1} />
          {/* Líneas guía horizontales */}
          {yTicks.map((y, i) => (
            <line key={i} x1={100} y1={y} x2={width - 20} y2={y} stroke={darkMode ? "#333" : "#f0f0f0"} strokeDasharray="2 2" />
          ))}
          {/* Etiquetas eje Y - Con más espacio para el signo $ */}
          {yLabels.map((label, i) => (
            <text key={i} x={95} y={yPositions[i] + 5} fontSize={12} fill={darkMode ? "#888" : "#666"} textAnchor="end">{label}</text>
          ))}
          {/* Grupos de barras y puntos */}
          {historicoFiltrado.map((h, i) => {
            const groupWidth = 38;
            const barWidth = 10;
            const stepX = historicoFiltrado.length > 1 ? (width - 140) / (historicoFiltrado.length - 1) : 0;
            const x = historicoFiltrado.length === 1 ? width / 2 : 120 + i * stepX;
            return (
              <g key={h.mes}>
                {/* Presupuesto */}
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
                {/* Ejecutado */}
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
                {/* Punto de desviación */}
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
          {/* Línea de desviación */}
          <polyline points={historicoFiltrado.map((h, i) => {
            const stepX = historicoFiltrado.length > 1 ? (width - 140) / (historicoFiltrado.length - 1) : 0;
            const x = historicoFiltrado.length === 1 ? width / 2 : 120 + i * stepX;
            const y = height - ((h.ejecutado - h.presupuestado + h.presupuestado) / maxY) * height;
            return `${x},${y}`;
          }).join(' ')} fill="none" stroke="#ef4444" strokeWidth={2} />
          {/* Etiquetas eje X */}
          {historicoFiltrado.map((h, i) => {
            const stepX = historicoFiltrado.length > 1 ? (width - 140) / (historicoFiltrado.length - 1) : 0;
            const x = historicoFiltrado.length === 1 ? width / 2 : 120 + i * stepX;
            return (
              <text key={h.mes} x={x} y={height + 24} textAnchor="middle" fontSize={14} fill={darkMode ? "#888" : "#666"}>{h.mes}</text>
            );
          })}
        </svg>
        
        {/* Tooltip */}
        {tooltip && (
          <div style={{
            position: "fixed",
            left: tooltip.x + 10,
            top: tooltip.y - 10,
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
            {tooltip.content}
          </div>
        )}
      </div>
      {/* Desglose por categorías */}
      <div style={{ width: "100%", maxWidth: 1400, margin: "0 auto", background: darkMode ? "#4A5568" : "#fff", borderRadius: 18, boxShadow: darkMode ? "0 2px 12px #0008" : "0 2px 12px #0001", padding: 36, marginBottom: 40, border: darkMode ? "1.5px solid #4A5568" : "none", transition: "background 0.3s, color 0.3s, border 0.3s" }}>
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
            {(selectedCategoria ? data.categorias.filter(cat => cat.nombre === selectedCategoria) : data.categorias).map(cat => {
              const dev = cat.ejecutado - cat.presupuestado;
              const isExpanded = expandedCategoria === cat.nombre;
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
                    <tr key={cat.nombre + sub.nombre} style={{ borderBottom: darkMode ? "1px solid #4A5568" : "1px solid #f0f0f0" }}>
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
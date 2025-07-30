import React, { useRef, useState } from "react";
import "./FrontGerencia.css";
import loginIcon from '../assets/CLARO_MEDIA_2_converted.jpg';
import { useEffect } from "react";
import { FiLogOut } from "react-icons/fi";

const resumen = [
  { title: "EBITDA Presupuestado", value: "$1,200,000", change: 5.2, icon: "📈", color: "blue" },
  { title: "EBITDA Ejecutado", value: "$1,050,000", change: -3.8, icon: "💸", color: "red" },
  { title: "EBITDA Proyección", value: "$1,180,000", change: 2.1, icon: "🔮", color: "green" },
];

const tareas = [
  {
    hora: "Hoy, 2:30PM - 3:00PM",
    titulo: "Revisión de presupuesto mensual",
    descripcion: "Verifica el avance del presupuesto y ajusta proyecciones.",
    prioridad: "Alta Prioridad",
  },
];

const anios = [2022, 2023, 2024];
const mesesFiltro = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// Datos mock para la gráfica
const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const presupuestado = [100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210];
const ejecutado = [98, 108, 115, 125, 135, 140, 155, 165, 175, 185, 195, 205];
const prevision = [99, 109, 118, 128, 138, 145, 158, 168, 178, 188, 198, 208];

function getLinePoints(data, maxY, width, height) {
  const stepX = width / (data.length - 1);
  return data
    .map((y, i) => {
      const x = i * stepX;
      const yPos = height - (y / maxY) * height;
      return `${x},${yPos}`;
    })
    .join(" ");
}

const FrontGerencia = () => {
  const width = 420;
  const height = 160;
  const maxY = 220;
  const fileInputRef = useRef();
  const [anio, setAnio] = useState(2024);
  const [mes, setMes] = useState("Septiembre");
  const [utcTime, setUtcTime] = useState(new Date().toUTCString());

  // Actualiza la hora UTC cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      setUtcTime(new Date().toUTCString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleFileClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      alert(`Archivo seleccionado: ${file.name} (funcionalidad próximamente)`);
    }
  };

  const handleLogout = () => {
    window.location.href = "/";
  };

  return (
    <div className="dashboard-container">
      {/* Header profesional */}
      <div className="dashboard-header bvc-header">
        <div className="logo-area">
          {/* Aquí puedes poner el logo de tu empresa */}
          <img src="/vite.svg" alt="Logo" className="logo-img" />
          <span className="bvc-title">Seguimiento Presupuesto</span>
        </div>
        <div className="user-area">
          <span className="user-name">Usuario</span>
          <img src="/src/assets/react.svg" alt="Avatar" className="user-avatar-img" />
        </div>
      </div>
      {/* Filtros visuales */}
      <div className="dashboard-filters">
        <label>
          Año:
          <select value={anio} onChange={e => setAnio(Number(e.target.value))}>
            {anios.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <label>
          Mes:
          <select value={mes} onChange={e => setMes(e.target.value)}>
            {mesesFiltro.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <button className="add-btn" onClick={handleFileClick} style={{marginLeft: 12}}>Cargar presupuesto</button>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          style={{ display: "none" }}
          ref={fileInputRef}
          onChange={handleFileChange}
        />
      </div>
      {/* Indicadores principales */}
      <div className="dashboard-summary bvc-summary">
        {resumen.map((card) => (
          <div className={`summary-card bvc-card ${card.color}`} key={card.title}>
            <div className="summary-icon">{card.icon}</div>
            <div className="summary-title">{card.title}</div>
            <div className="summary-value">{card.value}</div>
            <div className={`summary-change ${card.change < 0 ? "down" : "up"}`}>
              {card.change}%
            </div>
          </div>
        ))}
      </div>
      <div className="dashboard-main">
        <div className="dashboard-left">
          <div className="task-section">
            <div className="section-header">
              <span>Tarea</span>
              <button className="add-btn">+ Agregar</button>
            </div>
            {tareas.map((t, idx) => (
              <div className="task-card" key={idx}>
                <div className="task-time">{t.hora}</div>
                <div className="task-title">{t.titulo}</div>
                <div className="task-desc">{t.descripcion}</div>
                <span className="task-priority">{t.prioridad}</span>
              </div>
            ))}
          </div>
          <div className="deal-stage-section">
            <div className="section-header">
              <span>Etapa del trato</span>
            </div>
            <div className="deal-stage-chart">
              <svg width="100" height="100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#eee" strokeWidth="12" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#4f8cff" strokeWidth="12" strokeDasharray="251.2" strokeDashoffset="0" />
              </svg>
              <div className="deal-stage-label">100%</div>
            </div>
          </div>
        </div>
        <div className="dashboard-center">
          <div className="revenue-section">
            <div className="section-header">
              <span>EBITDA CLARO MEDIA - Resultados Financieros</span>
            </div>
            <svg width={width} height={height} className="revenue-chart bvc-chart">
              {/* Presupuestado */}
              <polyline
                fill="none"
                stroke="#4f8cff"
                strokeWidth="3"
                points={getLinePoints(presupuestado, maxY, width, height)}
              />
              {/* Ejecutado */}
              <polyline
                fill="none"
                stroke="#00c48c"
                strokeWidth="3"
                points={getLinePoints(ejecutado, maxY, width, height)}
              />
              {/* Previsión */}
              <polyline
                fill="none"
                stroke="#ffb200"
                strokeWidth="3"
                strokeDasharray="6,4"
                points={getLinePoints(prevision, maxY, width, height)}
              />
              {/* Ejes y labels */}
              {meses.map((mes, i) => (
                <text
                  key={mes}
                  x={(i * width) / (meses.length - 1)}
                  y={height + 15}
                  fontSize="12"
                  textAnchor="middle"
                  fill="#888"
                >
                  {mes}
                </text>
              ))}
            </svg>
            <div className="legend">
              <span className="legend-item"><span className="legend-dot blue"></span>Presupuestado</span>
              <span className="legend-item"><span className="legend-dot green"></span>Ejecutado</span>
              <span className="legend-item"><span className="legend-dot yellow"></span>Previsión</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DashboardGeneral = () => {
  const width = 420;
  const height = 160;
  const maxY = 220;
  const fileInputRef = useRef();
  const [anio, setAnio] = useState(2024);
  const [mes, setMes] = useState("Septiembre");
  const [colombiaTime, setColombiaTime] = useState(new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" }));

  useEffect(() => {
    const interval = setInterval(() => {
      setColombiaTime(new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleFileClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      alert(`Archivo seleccionado: ${file.name} (funcionalidad próximamente)`);
    }
  };

  const handleLogout = () => {
    window.location.href = "/";
  };

  return (
    <div style={{
      minHeight: "100vh",
      minWidth: "100vw",
      background: "linear-gradient(120deg, #e0e7ff 0%, #f5f7fa 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      padding: "0",
      fontFamily: "'Inter', 'Roboto', Arial, sans-serif",
      position: "relative"
    }}>
      <div style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", marginTop: 48, marginBottom: 24, position: "relative" }}>
        {/* Colombian time at top left */}
        <div style={{ position: "absolute", left: 0, top: 0, display: "flex", alignItems: "center", height: "100%", paddingLeft: 24, color: "#000", fontWeight: 500, fontSize: 18 }}>
          <span>{colombiaTime}</span>
        </div>
        <img src={loginIcon} alt="Logo" style={{ height: 60, marginRight: 16 }} />
        <span style={{ fontWeight: 700, fontSize: 32, color: "#000", letterSpacing: 1 }}>Seguimiento Presupuesto</span>
        {/* Logout icon at top right */}
        <div style={{ position: "absolute", right: 0, top: 0, display: "flex", alignItems: "center", height: "100%", paddingRight: 24 }}>
          <button onClick={handleLogout} style={{ background: "none", border: "none", cursor: "pointer", color: "#000", fontSize: 28 }} title="Salir">
            <FiLogOut />
          </button>
        </div>
        {/* UTC clock at top right */}
        {/* <div style={{ position: "absolute", right: 0, top: 0, display: "flex", alignItems: "center", height: "100%", paddingRight: 24, color: "#000", fontWeight: 500, fontSize: 18 }}>
          <span>{utcTime}</span>
        </div> */}
      </div>
      <div style={{
        background: "rgba(255,255,255,0.98)",
        borderRadius: 18,
        boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
        border: "1.5px solid #e3e8f0",
        padding: 36,
        maxWidth: 1100,
        width: "95%",
        margin: "0 auto"
      }}>
        {/* Filtros visuales */}
        <div style={{ display: "flex", gap: 24, alignItems: "center", marginBottom: 32 }}>
            <label style={{ fontWeight: 500, color: "#000" }}>
            Año:
            <select value={anio} onChange={e => setAnio(Number(e.target.value))} style={{ marginLeft: 8, borderRadius: 6, padding: 4 }}>
              {anios.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
            <label style={{ fontWeight: 500, color: "#000" }}>
            Mes:
            <select value={mes} onChange={e => setMes(e.target.value)} style={{ marginLeft: 8, borderRadius: 6, padding: 4 }}>
              {mesesFiltro.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
            <button style={{marginLeft: 12, background: "#000", color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontWeight: 600, boxShadow: "0 2px 8px rgba(0,0,0,0.10)", cursor: "pointer"}} onClick={handleFileClick}>Cargar presupuesto</button>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            style={{ display: "none" }}
            ref={fileInputRef}
            onChange={handleFileChange}
          />
        </div>
        {/* Indicadores principales */}
        <div style={{ display: "flex", gap: 24, marginBottom: 32, justifyContent: "center" }}>
          {resumen.map((card) => (
            <div key={card.title} style={{
              background: "#f8fafc",
              borderRadius: 14,
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              padding: "24px 32px",
              minWidth: 220,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              border: `2px solid ${card.color === 'blue' ? '#000' : card.color === 'red' ? '#e53935' : '#43a047'}`
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{card.icon}</div>
              <div style={{ fontSize: 17, color: "#888", marginBottom: 8 }}>{card.title}</div>
              <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{card.value}</div>
              <div style={{ fontSize: 16, color: card.change < 0 ? "#e53935" : "#43a047" }}>{card.change}%</div>
            </div>
          ))}
        </div>
        {/* Gráfica de resultados */}
        <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", padding: 32, marginBottom: 32 }}>
          <div style={{ fontWeight: 600, fontSize: 20, color: "#1976d2", marginBottom: 18 }}>EBITDA CLARO MEDIA - Resultados Financieros</div>
          <svg width={width} height={height} style={{ width: "100%", maxWidth: 600, height: 180 }}>
            {/* Presupuestado */}
            <polyline fill="none" stroke="#1976d2" strokeWidth="3" points={getLinePoints(presupuestado, maxY, width, height)} />
            {/* Ejecutado */}
            <polyline fill="none" stroke="#43a047" strokeWidth="3" points={getLinePoints(ejecutado, maxY, width, height)} />
            {/* Previsión */}
            <polyline fill="none" stroke="#ffb200" strokeWidth="3" strokeDasharray="6,4" points={getLinePoints(prevision, maxY, width, height)} />
            {/* Ejes y labels */}
            {meses.map((mes, i) => (
              <text key={mes} x={(i * width) / (meses.length - 1)} y={height + 15} fontSize="12" textAnchor="middle" fill="#888">{mes}</text>
            ))}
          </svg>
          <div style={{ display: "flex", gap: 18, marginTop: 12 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 14, height: 6, background: "#1976d2", borderRadius: 3, display: "inline-block" }}></span>Presupuestado</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 14, height: 6, background: "#43a047", borderRadius: 3, display: "inline-block" }}></span>Ejecutado</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 14, height: 6, background: "#ffb200", borderRadius: 3, display: "inline-block" }}></span>Previsión</span>
          </div>
        </div>
        {/* Tareas y etapa del trato */}
        <div style={{ display: "flex", gap: 24, justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 2px 8px rgba(25, 118, 210, 0.06)", padding: 28, minWidth: 320, flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 18, color: "#1976d2", marginBottom: 12 }}>Tarea</div>
            {tareas.map((t, idx) => (
              <div key={idx} style={{ marginBottom: 18, padding: 12, borderRadius: 8, background: "#f8fafc", boxShadow: "0 1px 4px rgba(25, 118, 210, 0.04)" }}>
                <div style={{ fontSize: 13, color: "#888" }}>{t.hora}</div>
                <div style={{ fontWeight: 600, fontSize: 16, color: "#1976d2" }}>{t.titulo}</div>
                <div style={{ fontSize: 14, color: "#444", marginBottom: 4 }}>{t.descripcion}</div>
                <span style={{ fontSize: 13, color: "#e53935", fontWeight: 500 }}>{t.prioridad}</span>
              </div>
            ))}
            <button style={{marginTop: 8, background: "#1976d2", color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontWeight: 600, boxShadow: "0 2px 8px rgba(25, 118, 210, 0.10)", cursor: "pointer"}}>+ Agregar</button>
          </div>
          <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 2px 8px rgba(25, 118, 210, 0.06)", padding: 28, minWidth: 320, flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontWeight: 600, fontSize: 18, color: "#1976d2", marginBottom: 12 }}>Etapa del trato</div>
            <svg width="100" height="100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#eee" strokeWidth="12" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="#1976d2" strokeWidth="12" strokeDasharray="251.2" strokeDashoffset="0" />
            </svg>
            <div style={{ fontWeight: 700, fontSize: 22, color: "#43a047", marginTop: 8 }}>100%</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardGeneral;
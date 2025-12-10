import { useState } from 'react';
import type { DashboardGeneralProps, DashboardState, DashboardData, ProcessedData, UseDashboardGeneralReturn, TooltipData } from './types';

const initialData: DashboardData = {
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

export const useDashboardGeneral = (props: DashboardGeneralProps): UseDashboardGeneralReturn => {
  const [state, setState] = useState<DashboardState>({
    selectedYear: 2025,
    selectedMonth: "",
    tipoSeguimiento: "ingresos",
    selectedCategoria: "",
    expandedCategoria: null,
    tooltip: null
  });

  const updateState = (updates: Partial<DashboardState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const setSelectedYear = (selectedYear: number) => {
    updateState({ selectedYear });
  };

  const setSelectedMonth = (selectedMonth: string) => {
    updateState({ selectedMonth });
  };

  const setTipoSeguimiento = (tipoSeguimiento: 'ingresos' | 'costos' | 'ebitda') => {
    updateState({ tipoSeguimiento });
  };

  const setSelectedCategoria = (selectedCategoria: string) => {
    updateState({ selectedCategoria });
  };

  const setExpandedCategoria = (expandedCategoria: string | null) => {
    updateState({ expandedCategoria });
  };

  const setTooltip = (tooltip: TooltipData | null) => {
    updateState({ tooltip });
  };

  const getTipoData = (): ProcessedData => {
    const yearData = initialData[state.selectedYear];
    
    if (state.tipoSeguimiento === "ingresos") {
      return {
        presupuestado: yearData.presupuestado * 0.6,
        ejecutado: yearData.ejecutado * 0.6,
        categorias: yearData.categorias.map(cat => ({ 
          ...cat, 
          presupuestado: cat.presupuestado * 0.6, 
          ejecutado: cat.ejecutado * 0.6,
          subcategorias: cat.subcategorias?.map(sub => ({
            ...sub,
            presupuestado: sub.presupuestado * 0.6,
            ejecutado: sub.ejecutado * 0.6
          }))
        })),
        historico: yearData.historico.map(h => ({ 
          ...h, 
          presupuestado: h.presupuestado * 0.6, 
          ejecutado: h.ejecutado * 0.6 
        }))
      };
    } else if (state.tipoSeguimiento === "costos") {
      return {
        presupuestado: yearData.presupuestado * 0.4,
        ejecutado: yearData.ejecutado * 0.4,
        categorias: yearData.categorias.map(cat => ({ 
          ...cat, 
          presupuestado: cat.presupuestado * 0.4, 
          ejecutado: cat.ejecutado * 0.4,
          subcategorias: cat.subcategorias?.map(sub => ({
            ...sub,
            presupuestado: sub.presupuestado * 0.4,
            ejecutado: sub.ejecutado * 0.4
          }))
        })),
        historico: yearData.historico.map(h => ({ 
          ...h, 
          presupuestado: h.presupuestado * 0.4, 
          ejecutado: h.ejecutado * 0.4 
        }))
      };
    }
    return yearData;
  };

  const data = getTipoData();
  const desviacion = data.ejecutado - data.presupuestado;
  const desviacionPorc = ((data.ejecutado - data.presupuestado) / data.presupuestado) * 100;

  const historicoFiltrado = state.selectedMonth
    ? data.historico.filter(h => h.mes === state.selectedMonth)
    : data.historico;

  const maxY = Math.max(...data.historico.map(h => Math.max(h.presupuestado, h.ejecutado)));

  const exportToCSV = () => {
    const rows = [
      ["Categoría", "Presupuestado", "Ejecutado", "Desviación"],
      ...data.categorias.map(cat => [cat.nombre, cat.presupuestado, cat.ejecutado, cat.ejecutado - cat.presupuestado])
    ];
    const csvContent = rows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `presupuesto_categorias_${state.selectedYear}_${state.tipoSeguimiento}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return {
    state,
    data,
    desviacion,
    desviacionPorc,
    historicoFiltrado,
    maxY,
    setSelectedYear,
    setSelectedMonth,
    setTipoSeguimiento,
    setSelectedCategoria,
    setExpandedCategoria,
    setTooltip,
    exportToCSV
  };
};
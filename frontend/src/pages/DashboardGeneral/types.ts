export interface DashboardGeneralProps {
  darkMode: boolean;
  setDarkMode: (darkMode: boolean) => void;
  onBack: () => void;
  onGoToAdmin: () => void;
  onGoToUpload: () => void;
}

export interface CategoryData {
  nombre: string;
  presupuestado: number;
  ejecutado: number;
  subcategorias?: SubcategoryData[];
}

export interface SubcategoryData {
  nombre: string;
  presupuestado: number;
  ejecutado: number;
}

export interface HistoricoData {
  mes: string;
  presupuestado: number;
  ejecutado: number;
}

export interface YearData {
  presupuestado: number;
  ejecutado: number;
  categorias: CategoryData[];
  historico: HistoricoData[];
}

export interface DashboardData {
  [year: number]: YearData;
}

export interface DashboardState {
  selectedYear: number;
  selectedMonth: string;
  tipoSeguimiento: 'ingresos' | 'costos' | 'ebitda';
  selectedCategoria: string;
  expandedCategoria: string | null;
  tooltip: TooltipData | null;
}

export interface TooltipData {
  x: number;
  y: number;
  content: string;
}

export interface ProcessedData {
  presupuestado: number;
  ejecutado: number;
  categorias: CategoryData[];
  historico: HistoricoData[];
}

export interface UseDashboardGeneralReturn {
  state: DashboardState;
  data: ProcessedData;
  desviacion: number;
  desviacionPorc: number;
  historicoFiltrado: HistoricoData[];
  maxY: number;
  setSelectedYear: (year: number) => void;
  setSelectedMonth: (month: string) => void;
  setTipoSeguimiento: (tipo: 'ingresos' | 'costos' | 'ebitda') => void;
  setSelectedCategoria: (categoria: string) => void;
  setExpandedCategoria: (categoria: string | null) => void;
  setTooltip: (tooltip: TooltipData | null) => void;
  exportToCSV: () => void;
}
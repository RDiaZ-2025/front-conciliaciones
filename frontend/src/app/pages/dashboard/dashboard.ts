import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { SelectModule } from 'primeng/select'; // Trying SelectModule for v20, fallback to Dropdown if needed

import { AuthService } from '../../services/auth';
import { PERMISSIONS } from '../../constants/permissions';

// Interfaces
interface SubCategory {
  nombre: string;
  presupuestado: number;
  ejecutado: number;
}

interface Category {
  nombre: string;
  presupuestado: number;
  ejecutado: number;
  subcategorias?: SubCategory[];
}

interface HistoricData {
  mes: string;
  presupuestado: number;
  ejecutado: number;
}

interface YearData {
  presupuestado: number;
  ejecutado: number;
  categorias: Category[];
  historico: HistoricData[];
}

interface DashboardData {
  [key: number]: YearData;
}

interface TooltipData {
  x: number;
  y: number;
  content: string;
}

// Initial Data
const initialData: DashboardData = {
  2023: {
    presupuestado: 950000,
    ejecutado: 1025000,
    categorias: [
      {
        nombre: "SMS POR SUSCRIPCION", presupuestado: 200000, ejecutado: 210000, subcategorias: [
          { nombre: "Campañas", presupuestado: 120000, ejecutado: 125000 },
          { nombre: "Alertas", presupuestado: 80000, ejecutado: 85000 },
        ]
      },
      {
        nombre: "COMERCIAL", presupuestado: 180000, ejecutado: 175000, subcategorias: [
          { nombre: "Ventas", presupuestado: 100000, ejecutado: 95000 },
          { nombre: "Promociones", presupuestado: 80000, ejecutado: 80000 },
        ]
      },
      {
        nombre: "REVISTA 15 MINUTOS", presupuestado: 150000, ejecutado: 170000, subcategorias: [
          { nombre: "Edición impresa", presupuestado: 90000, ejecutado: 100000 },
          { nombre: "Edición digital", presupuestado: 60000, ejecutado: 70000 },
        ]
      },
      {
        nombre: "PORTAL WEB", presupuestado: 140000, ejecutado: 135000, subcategorias: [
          { nombre: "Publicidad", presupuestado: 80000, ejecutado: 75000 },
          { nombre: "Contenido", presupuestado: 60000, ejecutado: 60000 },
        ]
      },
      {
        nombre: "NOTICIERO", presupuestado: 160000, ejecutado: 180000, subcategorias: [
          { nombre: "Producción", presupuestado: 100000, ejecutado: 110000 },
          { nombre: "Distribución", presupuestado: 60000, ejecutado: 70000 },
        ]
      },
      {
        nombre: "MOBILEMARKETING", presupuestado: 120000, ejecutado: 115000, subcategorias: [
          { nombre: "SMS", presupuestado: 70000, ejecutado: 65000 },
          { nombre: "Push", presupuestado: 50000, ejecutado: 50000 },
        ]
      },
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
      {
        nombre: "SMS POR SUSCRIPCION", presupuestado: 70000, ejecutado: 72000, subcategorias: [
          { nombre: "SMS Nacional", presupuestado: 40000, ejecutado: 42000 },
          { nombre: "SMS Internacional", presupuestado: 30000, ejecutado: 30000 }
        ]
      },
      {
        nombre: "COMERCIAL", presupuestado: 65000, ejecutado: 67000, subcategorias: [
          { nombre: "TV", presupuestado: 35000, ejecutado: 37000 },
          { nombre: "Radio", presupuestado: 30000, ejecutado: 30000 }
        ]
      },
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

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    SelectButtonModule,
    SelectModule,
    TableModule,
    TooltipModule,
    TagModule,
    IconFieldModule,
    InputIconModule
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent {
  private router = inject(Router);
  private authService = inject(AuthService);

  // Constants
  readonly PERMISSIONS = PERMISSIONS;
  readonly years = [2023, 2024, 2025];
  readonly months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  // Options for SelectButton
  readonly seguimientoOptions = [
    { label: 'Ingresos', value: 'ingresos' },
    { label: 'Costos', value: 'costos' },
    { label: 'Ebitda', value: 'ebitda' }
  ];

  // State Signals
  selectedYear = signal<number>(2025);
  selectedMonth = signal<string | null>(null); // Empty string in React, using null here for cleaner PrimeNG handling
  tipoSeguimiento = signal<'ingresos' | 'costos' | 'ebitda'>('ingresos');
  expandedCategories = signal<{ [key: string]: boolean }>({});
  tooltip = signal<TooltipData | null>(null);

  // Computed Signals
  currentData = computed(() => {
    const yearData = initialData[this.selectedYear()];
    const tipo = this.tipoSeguimiento();

    // Apply multipliers based on type (logic from React hook)
    let multiplier = 1;
    if (tipo === 'ingresos') multiplier = 0.6;
    else if (tipo === 'costos') multiplier = 0.4;

    // Deep copy and apply multiplier
    const processedData = JSON.parse(JSON.stringify(yearData));

    if (multiplier !== 1) {
      processedData.presupuestado *= multiplier;
      processedData.ejecutado *= multiplier;
      processedData.categorias = processedData.categorias.map((cat: any) => ({
        ...cat,
        presupuestado: cat.presupuestado * multiplier,
        ejecutado: cat.ejecutado * multiplier,
        subcategorias: cat.subcategorias?.map((sub: any) => ({
          ...sub,
          presupuestado: sub.presupuestado * multiplier,
          ejecutado: sub.ejecutado * multiplier
        }))
      }));
      processedData.historico = processedData.historico.map((h: any) => ({
        ...h,
        presupuestado: h.presupuestado * multiplier,
        ejecutado: h.ejecutado * multiplier
      }));
    }

    return processedData;
  });

  historicoFiltrado = computed(() => {
    const data = this.currentData();
    const month = this.selectedMonth();
    if (month) {
      return data.historico.filter((h: any) => h.mes === month);
    }
    return data.historico;
  });

  maxY = computed(() => {
    const data = this.currentData();
    return Math.max(...data.historico.map((h: any) => Math.max(h.presupuestado, h.ejecutado)));
  });

  yTicks = computed(() => {
    const height = 220;
    return [0, 0.25, 0.5, 0.75, 1].map(v => height - v * height);
  });

  yLabels = computed(() => {
    const max = this.maxY();
    return [0, 0.25, 0.5, 0.75, 1].map(v => `$${Math.round(max * v).toLocaleString()}`);
  });

  polylinePoints = computed(() => {
    const historico = this.historicoFiltrado();
    const width = 900;

    return historico.map((h: any, i: number) => {
      const stepX = historico.length > 1 ? (width - 140) / (historico.length - 1) : 0;
      const x = historico.length === 1 ? width / 2 : 120 + i * stepX;
      const y = this.getDifferenceY(h.presupuestado, h.ejecutado);
      return `${x},${y}`;
    }).join(' ');
  });

  // Methods
  hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission);
  }

  onGoToUpload() {
    this.router.navigate(['/upload']);
  }

  onGoToAdmin() {
    this.router.navigate(['/admin']);
  }

  toggleCategory(categoryName: string) {
    this.expandedCategories.update(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  }

  isExpanded(categoryName: string): boolean {
    return !!this.expandedCategories()[categoryName];
  }

  // Chart helpers
  getBarHeight(value: number): number {
    const height = 220;
    const max = this.maxY();
    return (value / max) * height;
  }

  getBarY(value: number): number {
    const height = 220;
    const max = this.maxY();
    return height - (value / max) * height;
  }

  getDifferenceY(presupuestado: number, ejecutado: number): number {
    const height = 220;
    const max = this.maxY();
    const val = ejecutado - presupuestado + presupuestado; // Logic from React: (h.ejecutado - h.presupuestado + h.presupuestado) which simplifies to h.ejecutado ?? Wait.
    // React code: height - ((h.ejecutado - h.presupuestado + h.presupuestado) / maxY) * height
    // h.ejecutado - h.presupuestado + h.presupuestado = h.ejecutado.
    // So it's just h.ejecutado?
    // Let's re-read React code:
    // <circle cx={x} cy={height - ((h.ejecutado - h.presupuestado + h.presupuestado) / maxY) * height}
    // Yes, it simplifies to h.ejecutado. But maybe the intention was different. I'll stick to h.ejecutado.
    // Wait, the polyline also uses this.
    return this.getBarY(ejecutado);
  }

  showTooltip(event: MouseEvent, content: string) {
    this.tooltip.set({
      x: event.clientX,
      y: event.clientY,
      content
    });
  }

  hideTooltip() {
    this.tooltip.set(null);
  }

  exportToCSV() {
    const data = this.currentData();
    const rows = [
      ["Categoría", "Presupuestado", "Ejecutado", "Desviación"],
      ...data.categorias.map((cat: any) => [cat.nombre, cat.presupuestado, cat.ejecutado, cat.ejecutado - cat.presupuestado])
    ];
    const csvContent = rows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `presupuesto_categorias_${this.selectedYear()}_${this.tipoSeguimiento()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

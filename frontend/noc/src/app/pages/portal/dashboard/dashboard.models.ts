import { environment } from '../../../../environments/environment';

export const DASHBOARD_COLORS = {
    primary: 'hsl(355, 100%, 60%)',
    primaryAlpha: 'hsla(355, 100%, 60%, 0.6)',
    primaryLight: 'hsla(355, 100%, 60%, 0.1)',
    secondary: '#ffa502',
    secondaryLight: 'rgba(255, 165, 2, 0.1)',
    tertiary: '#2ed573',
    slate: {
        50: '#f8fafc',
        100: '#f1f5f9',
        200: '#e2e8f0',
        300: '#cbd5e1',
        400: '#94a3b8',
        500: '#64748b',
        600: '#475569',
        700: '#334155',
        800: '#1e293b',
        900: '#0f172a'
    }
};

export const getChartTheme = (isDark: boolean) => ({
    fontFamily: "'Outfit', 'Inter', sans-serif",
    textColor: isDark ? '#94a3b8' : '#64748b',
    gridColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
    tooltipBg: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
    tooltipText: isDark ? '#ffffff' : '#0f172a',
    tooltipBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
});

export const CHART_DEFAULTS = {
    fontFamily: "'Outfit', 'Inter', sans-serif",
    fontSize: 12
};

export const DASHBOARD_CONFIG = {
    apiUrl: environment.apiUrl,
    defaultStartDate: '2024-01-01',
    minSessionsThreshold: 50
};

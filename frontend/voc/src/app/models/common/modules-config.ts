export const SYSTEM_MODULES = [
    {
        name: 'Portal',
        icon: '🏛️',
        adminOnly: false,
        submodules: [
            { code: 'dashboard', label: 'Dashboard', route: '/portal/dashboard' },
            { code: 'ingresos', label: 'Ingresos (Beta)', route: '/portal/ingresos' },
            { code: 'presupuesto', label: 'Presupuesto (Beta)', route: '/portal/presupuesto' }
        ]
    },
    {
        name: 'Mensajería',
        icon: '💬',
        submodules: [
            { code: 'segmentacion', label: 'Segmentación Bases (Beta)', route: '/messages/segmentacion-bases' },
            { code: 'analisis', label: 'Análisis SMS (Beta)', route: '/messages/analisis-sms' }
        ]
    },
    {
        name: 'Noticias',
        icon: '📰',
        submodules: [
            { code: 'auto_generar', label: 'Auto Generar', route: '/news/auto-generar' }
        ]
    }
];

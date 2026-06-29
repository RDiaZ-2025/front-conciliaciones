export const SYSTEM_MODULES = [
    {
        name: 'Administración',
        icon: '🛡️',
        adminOnly: true,
        submodules: [
            { code: 'roles', label: 'Asignación de Roles', route: '/admin/roles' }
        ]
    },
    {
        name: 'Portal',
        icon: '🏛️',
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
            { code: 'segmentacion', label: 'Segmentación Bases (Beta)', route: '/admin/mensajeria/segmentacion-bases' },
            { code: 'analisis', label: 'Análisis SMS (Beta)', route: '/admin/mensajeria/analisis-sms' }
        ]
    },
    {
        name: 'Noticias',
        icon: '📰',
        submodules: [
            { code: 'auto_generar', label: 'Auto Generar', route: '/noticias/auto-generar' }
        ]
    }
];

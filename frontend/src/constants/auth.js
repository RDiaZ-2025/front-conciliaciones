export const ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  DASHBOARD_ONLY: 'dashboard_only',
  FULL_ACCESS: 'full_access'
};

export const PERMISSIONS = {
  ADMIN_PANEL: 'admin_panel',
  DOCUMENT_UPLOAD: 'document_upload',
  MANAGEMENT_DASHBOARD: 'management_dashboard',
  HISTORY_LOAD_COMMERCIAL_FILES: 'historial_carga_archivos_comerciales',
  VIEW_HISTORY: 'view_history',
  PRODUCTION_MANAGEMENT: 'production_management'
};

export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    PERMISSIONS.ADMIN_PANEL,
    PERMISSIONS.DOCUMENT_UPLOAD,
    PERMISSIONS.MANAGEMENT_DASHBOARD,
    PERMISSIONS.HISTORY_LOAD_COMMERCIAL_FILES,
    PERMISSIONS.VIEW_HISTORY,
    PERMISSIONS.PRODUCTION_MANAGEMENT
  ],
  [ROLES.USER]: [
    PERMISSIONS.DOCUMENT_UPLOAD,
    PERMISSIONS.VIEW_HISTORY
  ],
  [ROLES.DASHBOARD_ONLY]: [
    PERMISSIONS.MANAGEMENT_DASHBOARD
  ],
  [ROLES.FULL_ACCESS]: [
    PERMISSIONS.ADMIN_PANEL,
    PERMISSIONS.DOCUMENT_UPLOAD,
    PERMISSIONS.MANAGEMENT_DASHBOARD,
    PERMISSIONS.HISTORY_LOAD_COMMERCIAL_FILES,
    PERMISSIONS.VIEW_HISTORY,
    PERMISSIONS.PRODUCTION_MANAGEMENT
  ]
};

export const PERMISSION_LABELS = {
  [PERMISSIONS.ADMIN_PANEL]: 'Panel de Administración',
  [PERMISSIONS.DOCUMENT_UPLOAD]: 'Carga de Documentos',
  [PERMISSIONS.MANAGEMENT_DASHBOARD]: 'Dashboard Gerencial',
  [PERMISSIONS.HISTORY_LOAD_COMMERCIAL_FILES]: 'Historial de Carga',
  [PERMISSIONS.VIEW_HISTORY]: 'Ver Historial',
  [PERMISSIONS.PRODUCTION_MANAGEMENT]: 'Gestión de Producción'
};

export const PERMISSION_DESCRIPTIONS = {
  [PERMISSIONS.ADMIN_PANEL]: 'Acceso al panel de administración y gestión de usuarios',
  [PERMISSIONS.DOCUMENT_UPLOAD]: 'Permite cargar y gestionar documentos en el sistema',
  [PERMISSIONS.MANAGEMENT_DASHBOARD]: 'Acceso al dashboard gerencial con reportes y estadísticas',
  [PERMISSIONS.HISTORY_LOAD_COMMERCIAL_FILES]: 'Permite ver el historial de carga de archivos comerciales',
  [PERMISSIONS.VIEW_HISTORY]: 'Permite ver el historial de actividades',
  [PERMISSIONS.PRODUCTION_MANAGEMENT]: 'Permite gestionar solicitudes de producción'
};

export const PERMISSION_COLORS = {
  [PERMISSIONS.ADMIN_PANEL]: 'error',
  [PERMISSIONS.DOCUMENT_UPLOAD]: 'primary',
  [PERMISSIONS.MANAGEMENT_DASHBOARD]: 'info',
  [PERMISSIONS.HISTORY_LOAD_COMMERCIAL_FILES]: 'secondary',
  [PERMISSIONS.VIEW_HISTORY]: 'success',
  [PERMISSIONS.PRODUCTION_MANAGEMENT]: 'warning'
};
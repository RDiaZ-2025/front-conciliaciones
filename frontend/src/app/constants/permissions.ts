export const PERMISSIONS = {
  ADMIN_PANEL: 'admin_panel',
  DOCUMENT_UPLOAD: 'document_upload',
  PORTADA_15_MINUTOS: 'portada_15_minutos',
  MANAGE_MENUS: 'manage_menus',
  MANAGEMENT_DASHBOARD: 'management_dashboard',
  HISTORY_LOAD_COMMERCIAL_FILES: 'historial_carga_archivos_comerciales',
  VIEW_HISTORY: 'view_history',
  PRODUCTION_MANAGEMENT: 'production_management'
} as const;

export type PermissionType = typeof PERMISSIONS[keyof typeof PERMISSIONS];

export const PERMISSION_LABELS = {
  [PERMISSIONS.ADMIN_PANEL]: 'Panel de Administración',
  [PERMISSIONS.DOCUMENT_UPLOAD]: 'Carga de Documentos',
  [PERMISSIONS.PORTADA_15_MINUTOS]: 'Portada 15 Minutos',
  [PERMISSIONS.MANAGE_MENUS]: 'Gestión de Menús',
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

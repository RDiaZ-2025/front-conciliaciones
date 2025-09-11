// Definición de roles y permisos
export const ROLES = {
  ADMIN: 'admin',
  UPLOAD_ONLY: 'upload_only',
  DASHBOARD_ONLY: 'dashboard_only',
  FULL_ACCESS: 'full_access'
};

export const PERMISSIONS = {
  ADMIN_PANEL: 'admin_panel',
  DOCUMENT_UPLOAD: 'document_upload',
  MANAGEMENT_DASHBOARD: 'management_dashboard',
  HISTORY_LOAD_COMMERCIAL_FILES: 'historial_carga_archivos_comerciales'
};

// Etiquetas descriptivas para permisos
export const PERMISSION_LABELS = {
  [PERMISSIONS.ADMIN_PANEL]: 'Panel de administración',
  [PERMISSIONS.DOCUMENT_UPLOAD]: 'Carga de documentos',
  [PERMISSIONS.MANAGEMENT_DASHBOARD]: 'Dashboard gerencial',
  [PERMISSIONS.HISTORY_LOAD_COMMERCIAL_FILES]: 'Historial Carga Archivos Comerciales'
};

// Descripciones de permisos
export const PERMISSION_DESCRIPTIONS = {
  [PERMISSIONS.ADMIN_PANEL]: 'Permite acceder al panel de administración y gestionar usuarios',
  [PERMISSIONS.DOCUMENT_UPLOAD]: 'Permite cargar y gestionar documentos en el sistema',
  [PERMISSIONS.MANAGEMENT_DASHBOARD]: 'Permite acceder al dashboard gerencial con reportes y estadísticas',
  [PERMISSIONS.HISTORY_LOAD_COMMERCIAL_FILES]: 'Permite ver el historial de carga de archivos comerciales por usuario'
};

// Colores para permisos
export const PERMISSION_COLORS = {
  [PERMISSIONS.ADMIN_PANEL]: 'default',
  [PERMISSIONS.DOCUMENT_UPLOAD]: 'default',
  [PERMISSIONS.MANAGEMENT_DASHBOARD]: 'default',
  [PERMISSIONS.HISTORY_LOAD_COMMERCIAL_FILES]: 'default'
};

// Configuración de permisos por rol (mantenido para compatibilidad)
export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    PERMISSIONS.ADMIN_PANEL,
    PERMISSIONS.DOCUMENT_UPLOAD,
    PERMISSIONS.MANAGEMENT_DASHBOARD
  ],
  [ROLES.UPLOAD_ONLY]: [
    PERMISSIONS.DOCUMENT_UPLOAD
  ],
  [ROLES.DASHBOARD_ONLY]: [
    PERMISSIONS.MANAGEMENT_DASHBOARD
  ],
  [ROLES.FULL_ACCESS]: [
    PERMISSIONS.ADMIN_PANEL,
    PERMISSIONS.DOCUMENT_UPLOAD,
    PERMISSIONS.MANAGEMENT_DASHBOARD
  ]
};
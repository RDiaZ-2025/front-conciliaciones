// Definición de roles y permisos
export const ROLES = {
  ADMIN: 'admin',
  UPLOAD_ONLY: 'upload_only',
  DASHBOARD_ONLY: 'dashboard_only',
  FULL_ACCESS: 'full_access'
};

export const PERMISSIONS = {
  VIEW_USERS: 'view_users',
  CREATE_USER: 'create_user',
  EDIT_USER: 'edit_user',
  DELETE_USER: 'delete_user',
  MANAGE_PERMISSIONS: 'manage_permissions',
  SYSTEM_CONFIG: 'system_config',
  ADMIN_PANEL: 'admin_panel',
  DOCUMENT_UPLOAD: 'document_upload',
  MANAGEMENT_DASHBOARD: 'management_dashboard',
  HISTORY_LOAD_COMMERCIAL_FILES: 'historial_carga_archivos_comerciales'
};

// Etiquetas descriptivas para permisos
export const PERMISSION_LABELS = {
  [PERMISSIONS.VIEW_USERS]: 'Ver usuarios',
  [PERMISSIONS.CREATE_USER]: 'Crear usuario',
  [PERMISSIONS.EDIT_USER]: 'Editar usuario',
  [PERMISSIONS.DELETE_USER]: 'Eliminar usuario',
  [PERMISSIONS.MANAGE_PERMISSIONS]: 'Gestionar permisos',
  [PERMISSIONS.SYSTEM_CONFIG]: 'Configuración del sistema',
  [PERMISSIONS.ADMIN_PANEL]: 'Panel de administración',
  [PERMISSIONS.DOCUMENT_UPLOAD]: 'Carga de documentos',
  [PERMISSIONS.MANAGEMENT_DASHBOARD]: 'Dashboard gerencial',
  [PERMISSIONS.HISTORY_LOAD_COMMERCIAL_FILES]: 'Historial Carga Archivos Comerciales'
};

// Descripciones de permisos
export const PERMISSION_DESCRIPTIONS = {
  [PERMISSIONS.VIEW_USERS]: 'Permite ver la lista de usuarios',
  [PERMISSIONS.CREATE_USER]: 'Permite crear nuevos usuarios',
  [PERMISSIONS.EDIT_USER]: 'Permite editar usuarios existentes',
  [PERMISSIONS.DELETE_USER]: 'Permite eliminar usuarios',
  [PERMISSIONS.MANAGE_PERMISSIONS]: 'Permite gestionar los permisos de los usuarios',
  [PERMISSIONS.SYSTEM_CONFIG]: 'Permite acceder y modificar la configuración del sistema',
  [PERMISSIONS.ADMIN_PANEL]: 'Permite acceder al panel de administración y gestionar usuarios',
  [PERMISSIONS.DOCUMENT_UPLOAD]: 'Permite cargar y gestionar documentos en el sistema',
  [PERMISSIONS.MANAGEMENT_DASHBOARD]: 'Permite acceder al dashboard gerencial con reportes y estadísticas',
  [PERMISSIONS.HISTORY_LOAD_COMMERCIAL_FILES]: 'Permite ver el historial de carga de archivos comerciales por usuario'
};

// Colores para permisos
export const PERMISSION_COLORS = {
  [PERMISSIONS.VIEW_USERS]: 'default',
  [PERMISSIONS.CREATE_USER]: 'default',
  [PERMISSIONS.EDIT_USER]: 'default',
  [PERMISSIONS.DELETE_USER]: 'default',
  [PERMISSIONS.MANAGE_PERMISSIONS]: 'default',
  [PERMISSIONS.SYSTEM_CONFIG]: 'default',
  [PERMISSIONS.ADMIN_PANEL]: 'default',
  [PERMISSIONS.DOCUMENT_UPLOAD]: 'default',
  [PERMISSIONS.MANAGEMENT_DASHBOARD]: 'default',
  [PERMISSIONS.HISTORY_LOAD_COMMERCIAL_FILES]: 'default'
};


// Configuración de permisos por rol (mantenido para compatibilidad)
export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.CREATE_USER,
    PERMISSIONS.EDIT_USER,
    PERMISSIONS.DELETE_USER,
    PERMISSIONS.MANAGE_PERMISSIONS,
    PERMISSIONS.SYSTEM_CONFIG,
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
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.CREATE_USER,
    PERMISSIONS.EDIT_USER,
    PERMISSIONS.DELETE_USER,
    PERMISSIONS.MANAGE_PERMISSIONS,
    PERMISSIONS.SYSTEM_CONFIG,
    PERMISSIONS.ADMIN_PANEL,
    PERMISSIONS.DOCUMENT_UPLOAD,
    PERMISSIONS.MANAGEMENT_DASHBOARD
  ]
};
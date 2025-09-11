-- Script para limpiar y simplificar permisos del sistema
-- Alinear con el sistema simplificado del frontend

-- Eliminar permisos obsoletos y mantener solo los simplificados
PRINT 'Iniciando limpieza de permisos...';

-- Eliminar relaciones de permisos obsoletos
DELETE FROM PERMISSIONS_BY_USER 
WHERE PermissionId IN (
    SELECT Id FROM PERMISSIONS 
    WHERE Name NOT IN ('admin_panel', 'document_upload', 'management_dashboard', 'historial_carga_archivos_comerciales')
);

PRINT 'Relaciones de permisos obsoletos eliminadas';

-- Eliminar permisos obsoletos
DELETE FROM PERMISSIONS 
WHERE Name NOT IN ('admin_panel', 'document_upload', 'management_dashboard', 'historial_carga_archivos_comerciales');

PRINT 'Permisos obsoletos eliminados';

-- Insertar permisos simplificados si no existen
IF NOT EXISTS (SELECT * FROM PERMISSIONS WHERE Name = 'admin_panel')
BEGIN
    INSERT INTO PERMISSIONS (Name, Description) VALUES 
    ('admin_panel', 'Acceso al panel de administración y gestión de usuarios');
    PRINT 'Permiso admin_panel insertado';
END

IF NOT EXISTS (SELECT * FROM PERMISSIONS WHERE Name = 'document_upload')
BEGIN
    INSERT INTO PERMISSIONS (Name, Description) VALUES 
    ('document_upload', 'Permite cargar y gestionar documentos en el sistema');
    PRINT 'Permiso document_upload insertado';
END

IF NOT EXISTS (SELECT * FROM PERMISSIONS WHERE Name = 'management_dashboard')
BEGIN
    INSERT INTO PERMISSIONS (Name, Description) VALUES 
    ('management_dashboard', 'Acceso al dashboard gerencial con reportes y estadísticas');
    PRINT 'Permiso management_dashboard insertado';
END

IF NOT EXISTS (SELECT * FROM PERMISSIONS WHERE Name = 'historial_carga_archivos_comerciales')
BEGIN
    INSERT INTO PERMISSIONS (Name, Description) VALUES 
    ('historial_carga_archivos_comerciales', 'Permite ver el historial de carga de archivos comerciales por usuario');
    PRINT 'Permiso historial_carga_archivos_comerciales insertado';
END

-- Asignar todos los permisos simplificados al usuario administrador principal
DECLARE @AdminUserId int;
SELECT @AdminUserId = Id FROM USERS WHERE Email = 'admin@claromedia.com';

IF @AdminUserId IS NOT NULL
BEGIN
    -- Eliminar permisos existentes del admin
    DELETE FROM PERMISSIONS_BY_USER WHERE UserId = @AdminUserId;
    
    -- Asignar todos los permisos simplificados
    INSERT INTO PERMISSIONS_BY_USER (UserId, PermissionId)
    SELECT @AdminUserId, Id FROM PERMISSIONS 
    WHERE Name IN ('admin_panel', 'document_upload', 'management_dashboard', 'historial_carga_archivos_comerciales');
    
    PRINT 'Permisos simplificados asignados al administrador principal';
END

-- Asignar permisos simplificados a otros usuarios administradores
DECLARE @AdminTestUserId int;
SELECT @AdminTestUserId = Id FROM USERS WHERE Email = 'admin@test.com';

IF @AdminTestUserId IS NOT NULL
BEGIN
    DELETE FROM PERMISSIONS_BY_USER WHERE UserId = @AdminTestUserId;
    INSERT INTO PERMISSIONS_BY_USER (UserId, PermissionId)
    SELECT @AdminTestUserId, Id FROM PERMISSIONS 
    WHERE Name IN ('admin_panel', 'document_upload', 'management_dashboard', 'historial_carga_archivos_comerciales');
    PRINT 'Permisos simplificados asignados a admin@test.com';
END

DECLARE @AdminPanelUserId int;
SELECT @AdminPanelUserId = Id FROM USERS WHERE Email = 'adminpanel@test.com';

IF @AdminPanelUserId IS NOT NULL
BEGIN
    DELETE FROM PERMISSIONS_BY_USER WHERE UserId = @AdminPanelUserId;
    INSERT INTO PERMISSIONS_BY_USER (UserId, PermissionId)
    SELECT @AdminPanelUserId, Id FROM PERMISSIONS 
    WHERE Name IN ('admin_panel', 'document_upload', 'management_dashboard', 'historial_carga_archivos_comerciales');
    PRINT 'Permisos simplificados asignados a adminpanel@test.com';
END

-- Asignar permisos específicos a usuarios de prueba
DECLARE @ManagerUserId int;
SELECT @ManagerUserId = Id FROM USERS WHERE Email = 'manager@test.com';

IF @ManagerUserId IS NOT NULL
BEGIN
    DELETE FROM PERMISSIONS_BY_USER WHERE UserId = @ManagerUserId;
    INSERT INTO PERMISSIONS_BY_USER (UserId, PermissionId)
    SELECT @ManagerUserId, Id FROM PERMISSIONS 
    WHERE Name IN ('document_upload', 'management_dashboard');
    PRINT 'Permisos asignados a manager@test.com';
END

DECLARE @UserTestUserId int;
SELECT @UserTestUserId = Id FROM USERS WHERE Email = 'user@test.com';

IF @UserTestUserId IS NOT NULL
BEGIN
    DELETE FROM PERMISSIONS_BY_USER WHERE UserId = @UserTestUserId;
    INSERT INTO PERMISSIONS_BY_USER (UserId, PermissionId)
    SELECT @UserTestUserId, Id FROM PERMISSIONS 
    WHERE Name = 'management_dashboard';
    PRINT 'Permisos asignados a user@test.com';
END

DECLARE @UploadUserId int;
SELECT @UploadUserId = Id FROM USERS WHERE Email = 'upload@claromedia.com';

IF @UploadUserId IS NOT NULL
BEGIN
    DELETE FROM PERMISSIONS_BY_USER WHERE UserId = @UploadUserId;
    INSERT INTO PERMISSIONS_BY_USER (UserId, PermissionId)
    SELECT @UploadUserId, Id FROM PERMISSIONS 
    WHERE Name = 'document_upload';
    PRINT 'Permisos asignados a upload@claromedia.com';
END

DECLARE @DashboardUserId int;
SELECT @DashboardUserId = Id FROM USERS WHERE Email = 'dashboard@claromedia.com';

IF @DashboardUserId IS NOT NULL
BEGIN
    DELETE FROM PERMISSIONS_BY_USER WHERE UserId = @DashboardUserId;
    INSERT INTO PERMISSIONS_BY_USER (UserId, PermissionId)
    SELECT @DashboardUserId, Id FROM PERMISSIONS 
    WHERE Name = 'management_dashboard';
    PRINT 'Permisos asignados a dashboard@claromedia.com';
END

PRINT 'Limpieza y simplificación de permisos completada exitosamente';
PRINT 'Permisos simplificados disponibles:';
PRINT '- admin_panel: Acceso al panel de administración y gestión de usuarios';
PRINT '- document_upload: Permite cargar y gestionar documentos en el sistema';
PRINT '- management_dashboard: Acceso al dashboard gerencial con reportes y estadísticas';
PRINT '- historial_carga_archivos_comerciales: Permite ver el historial de carga de archivos comerciales por usuario';
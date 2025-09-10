-- Script para insertar usuarios adicionales en la base de datos
-- Ejecutar después de database-setup.sql

-- Crear usuarios adicionales (solo si no existen)
IF NOT EXISTS (SELECT * FROM USERS WHERE Email = 'admin@test.com')
BEGIN
    INSERT INTO USERS (Name, Email, PasswordHash, Status) 
    VALUES ('Administrador Test', 'admin@test.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qK', 1);
    
    DECLARE @AdminTestUserId int = SCOPE_IDENTITY();
    
    -- Asignar todos los permisos al administrador test
    INSERT INTO PERMISSIONS_BY_USER (UserId, PermissionId)
    SELECT @AdminTestUserId, Id FROM PERMISSIONS;
    
    PRINT 'Usuario admin@test.com creado exitosamente';
END
ELSE
BEGIN
    PRINT 'Usuario admin@test.com ya existe';
END

IF NOT EXISTS (SELECT * FROM USERS WHERE Email = 'manager@test.com')
BEGIN
    INSERT INTO USERS (Name, Email, PasswordHash, Status) 
    VALUES ('Manager Test', 'manager@test.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qK', 1);
    
    DECLARE @ManagerUserId int = SCOPE_IDENTITY();
    
    -- Asignar permisos de manager (upload y dashboard)
    INSERT INTO PERMISSIONS_BY_USER (UserId, PermissionId)
    SELECT @ManagerUserId, Id FROM PERMISSIONS 
    WHERE Name IN ('view_upload', 'view_dashboard');
    
    PRINT 'Usuario manager@test.com creado exitosamente';
END
ELSE
BEGIN
    PRINT 'Usuario manager@test.com ya existe';
END

IF NOT EXISTS (SELECT * FROM USERS WHERE Email = 'user@test.com')
BEGIN
    INSERT INTO USERS (Name, Email, PasswordHash, Status) 
    VALUES ('Usuario Test', 'user@test.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qK', 1);
    
    DECLARE @UserTestUserId int = SCOPE_IDENTITY();
    
    -- Asignar solo permiso de dashboard
    INSERT INTO PERMISSIONS_BY_USER (UserId, PermissionId)
    SELECT @UserTestUserId, Id FROM PERMISSIONS 
    WHERE Name = 'view_dashboard';
    
    PRINT 'Usuario user@test.com creado exitosamente';
END
ELSE
BEGIN
    PRINT 'Usuario user@test.com ya existe';
END

IF NOT EXISTS (SELECT * FROM USERS WHERE Email = 'upload@claromedia.com')
BEGIN
    INSERT INTO USERS (Name, Email, PasswordHash, Status) 
    VALUES ('Usuario Carga Legacy', 'upload@claromedia.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qK', 1);
    
    DECLARE @UploadUserId int = SCOPE_IDENTITY();
    
    -- Asignar solo permiso de upload
    INSERT INTO PERMISSIONS_BY_USER (UserId, PermissionId)
    SELECT @UploadUserId, Id FROM PERMISSIONS 
    WHERE Name = 'view_upload';
    
    PRINT 'Usuario upload@claromedia.com creado exitosamente';
END
ELSE
BEGIN
    PRINT 'Usuario upload@claromedia.com ya existe';
END

IF NOT EXISTS (SELECT * FROM USERS WHERE Email = 'dashboard@claromedia.com')
BEGIN
    INSERT INTO USERS (Name, Email, PasswordHash, Status) 
    VALUES ('Usuario Dashboard Legacy', 'dashboard@claromedia.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qK', 1);
    
    DECLARE @DashboardUserId int = SCOPE_IDENTITY();
    
    -- Asignar solo permiso de dashboard
    INSERT INTO PERMISSIONS_BY_USER (UserId, PermissionId)
    SELECT @DashboardUserId, Id FROM PERMISSIONS 
    WHERE Name = 'view_dashboard';
    
    PRINT 'Usuario dashboard@claromedia.com creado exitosamente';
END
ELSE
BEGIN
    PRINT 'Usuario dashboard@claromedia.com ya existe';
END

IF NOT EXISTS (SELECT * FROM USERS WHERE Email = 'adminpanel@test.com')
BEGIN
    INSERT INTO USERS (Name, Email, PasswordHash, Status) 
    VALUES ('Admin Panel Test', 'adminpanel@test.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qK', 1);
    
    DECLARE @AdminPanelUserId int = SCOPE_IDENTITY();
    
    -- Asignar todos los permisos al administrador panel test
    INSERT INTO PERMISSIONS_BY_USER (UserId, PermissionId)
    SELECT @AdminPanelUserId, Id FROM PERMISSIONS;
    
    PRINT 'Usuario adminpanel@test.com creado exitosamente';
END
ELSE
BEGIN
    PRINT 'Usuario adminpanel@test.com ya existe';
END

PRINT 'Inserción de usuarios adicionales completada';
PRINT 'Usuarios disponibles:';
PRINT '- admin@claromedia.com / admin123 (Administrador completo)';
PRINT '- admin@test.com / admin123 (Administrador test)';
PRINT '- manager@test.com / manager123 (Manager)';
PRINT '- user@test.com / user123 (Usuario básico)';
PRINT '- upload@claromedia.com / upload123 (Solo carga)';
PRINT '- dashboard@claromedia.com / dashboard123 (Solo dashboard)';
PRINT '- adminpanel@test.com / 123456 (Admin Panel Test)';
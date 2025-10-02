-- Script para agregar el permiso production_management que falta
-- Este permiso es necesario para el módulo de Producción

PRINT 'Agregando permiso production_management...';

-- Insertar el permiso production_management si no existe
IF NOT EXISTS (SELECT * FROM PERMISSIONS WHERE Name = 'production_management')
BEGIN
    INSERT INTO PERMISSIONS (Name, Description) VALUES 
    ('production_management', 'Permite gestionar solicitudes de producción');
    PRINT 'Permiso production_management insertado exitosamente';
END
ELSE
BEGIN
    PRINT 'Permiso production_management ya existe';
END

-- Asignar el permiso a todos los usuarios administradores
PRINT 'Asignando permiso production_management a usuarios administradores...';

-- Admin principal
DECLARE @AdminUserId int;
SELECT @AdminUserId = Id FROM USERS WHERE Email = 'admin@claromedia.com';

IF @AdminUserId IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT * FROM PERMISSIONS_BY_USER pbu 
                   INNER JOIN PERMISSIONS p ON pbu.PermissionId = p.Id 
                   WHERE pbu.UserId = @AdminUserId AND p.Name = 'production_management')
    BEGIN
        INSERT INTO PERMISSIONS_BY_USER (UserId, PermissionId)
        SELECT @AdminUserId, Id FROM PERMISSIONS WHERE Name = 'production_management';
        PRINT 'Permiso production_management asignado a admin@claromedia.com';
    END
END

-- Admin Test
DECLARE @AdminTestUserId int;
SELECT @AdminTestUserId = Id FROM USERS WHERE Email = 'admin@test.com';

IF @AdminTestUserId IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT * FROM PERMISSIONS_BY_USER pbu 
                   INNER JOIN PERMISSIONS p ON pbu.PermissionId = p.Id 
                   WHERE pbu.UserId = @AdminTestUserId AND p.Name = 'production_management')
    BEGIN
        INSERT INTO PERMISSIONS_BY_USER (UserId, PermissionId)
        SELECT @AdminTestUserId, Id FROM PERMISSIONS WHERE Name = 'production_management';
        PRINT 'Permiso production_management asignado a admin@test.com';
    END
END

-- Admin Panel Test
DECLARE @AdminPanelUserId int;
SELECT @AdminPanelUserId = Id FROM USERS WHERE Email = 'adminpanel@test.com';

IF @AdminPanelUserId IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT * FROM PERMISSIONS_BY_USER pbu 
                   INNER JOIN PERMISSIONS p ON pbu.PermissionId = p.Id 
                   WHERE pbu.UserId = @AdminPanelUserId AND p.Name = 'production_management')
    BEGIN
        INSERT INTO PERMISSIONS_BY_USER (UserId, PermissionId)
        SELECT @AdminPanelUserId, Id FROM PERMISSIONS WHERE Name = 'production_management';
        PRINT 'Permiso production_management asignado a adminpanel@test.com';
    END
END

PRINT 'Proceso completado exitosamente';
PRINT 'El permiso production_management ha sido agregado y asignado a los usuarios administradores';
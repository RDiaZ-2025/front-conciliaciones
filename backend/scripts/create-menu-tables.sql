-- Script para crear tablas de menús parametrizados
-- Permite gestionar los menús desde la base de datos

PRINT 'Creando tablas para sistema de menús parametrizados...';

-- Create Menu Items Table with hierarchical structure
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='MENU_ITEMS' AND xtype='U')
BEGIN
    CREATE TABLE MENU_ITEMS (
        id INT IDENTITY(1,1) PRIMARY KEY,
        label NVARCHAR(100) NOT NULL,
        icon NVARCHAR(50),
        route NVARCHAR(255),
        parentId INT NULL,
        displayOrder INT DEFAULT 0,
        isActive BIT DEFAULT 1,
        FOREIGN KEY (parentId) REFERENCES MENU_ITEMS(id)
    );
    PRINT 'MENU_ITEMS table created successfully';
END
ELSE
BEGIN
    PRINT 'MENU_ITEMS table already exists';
END

-- Crear índices para mejorar el rendimiento
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_MENU_ITEMS_DisplayOrder')
BEGIN
    CREATE INDEX IX_MENU_ITEMS_DisplayOrder ON MENU_ITEMS(DisplayOrder, IsActive);
    PRINT 'Índice IX_MENU_ITEMS_DisplayOrder creado';
END

-- Insert Root Level Menu Items
IF NOT EXISTS (SELECT * FROM MENU_ITEMS WHERE label = 'Historial Carga Archivos')
BEGIN
    INSERT INTO MENU_ITEMS (label, icon, route, parentId, displayOrder) 
    VALUES ('Historial Carga Archivos', 'HistoryIcon', '/historial', NULL, 1);
    PRINT 'Historial menu item inserted';
END
ELSE
BEGIN
    PRINT 'Historial menu item already exists';
END

IF NOT EXISTS (SELECT * FROM MENU_ITEMS WHERE label = 'Cargar Documentos')
BEGIN
    INSERT INTO MENU_ITEMS (label, icon, route, parentId, displayOrder) 
    VALUES ('Cargar Documentos', 'UploadIcon', '/upload', NULL, 2);
    PRINT 'Upload menu item inserted';
END
ELSE
BEGIN
    PRINT 'Upload menu item already exists';
END

IF NOT EXISTS (SELECT * FROM MENU_ITEMS WHERE label = 'Dashboard de Gestión')
BEGIN
    INSERT INTO MENU_ITEMS (label, icon, route, parentId, displayOrder) 
    VALUES ('Dashboard de Gestión', 'DashboardIcon', '/dashboard', NULL, 3);
    PRINT 'Dashboard menu item inserted';
END
ELSE
BEGIN
    PRINT 'Dashboard menu item already exists';
END

IF NOT EXISTS (SELECT * FROM MENU_ITEMS WHERE label = 'Producción')
BEGIN
    INSERT INTO MENU_ITEMS (label, icon, route, parentId, displayOrder) 
    VALUES ('Producción', 'AssignmentIcon', '/production', NULL, 4);
    PRINT 'Production menu item inserted';
END
ELSE
BEGIN
    PRINT 'Production menu item already exists';
END

IF NOT EXISTS (SELECT * FROM MENU_ITEMS WHERE label = 'Usuarios')
BEGIN
    INSERT INTO MENU_ITEMS (label, icon, route, parentId, displayOrder) 
    VALUES ('Usuarios', 'PeopleIcon', '/admin', NULL, 5);
    PRINT 'Usuarios menu item inserted';
END
ELSE
BEGIN
    PRINT 'Usuarios menu item already exists';
END

-- Example of adding submenu items (commented out for now)
-- Get parent menu ID for adding submenus
-- DECLARE @productionParentId INT;
-- SELECT @productionParentId = id FROM MENU_ITEMS WHERE label = 'Producción';

-- IF NOT EXISTS (SELECT * FROM MENU_ITEMS WHERE label = 'Reportes de Producción')
-- BEGIN
--     INSERT INTO MENU_ITEMS (label, icon, route, parentId, displayOrder) 
--     VALUES ('Reportes de Producción', 'ReportIcon', '/production/reports', @productionParentId, 1);
--     PRINT 'Production Reports submenu item inserted';
-- END

PRINT 'Sistema de menús parametrizados creado exitosamente';
PRINT '';
PRINT 'Tabla creada:';
PRINT '- MENU_ITEMS: Elementos de menú con estructura jerárquica';
PRINT '';
PRINT 'Menús insertados:';
PRINT '- Historial Carga Archivos';
PRINT '- Cargar Documentos';
PRINT '- Dashboard de Gestión';
PRINT '- Producción';
PRINT '- Usuarios';
PRINT '';
PRINT 'El sistema ahora permite gestionar los menús desde la base de datos';
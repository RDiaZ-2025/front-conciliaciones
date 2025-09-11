-- Script de configuración de base de datos para Sistema de Conciliaciones
-- Esquema de autenticación y permisos

-- Crear tabla USERS
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='USERS' AND xtype='U')
BEGIN
    CREATE TABLE USERS (
        Id int IDENTITY(1,1) PRIMARY KEY,
        Name varchar(255) NOT NULL,
        Email varchar(255) NOT NULL UNIQUE,
        PasswordHash varchar(255) NOT NULL,
        LastAccess datetime NULL,
        Status int NOT NULL DEFAULT 1,
        CreatedAt datetime NOT NULL DEFAULT GETDATE(),
        UpdatedAt datetime NOT NULL DEFAULT GETDATE()
    );
    
    PRINT 'Tabla USERS creada exitosamente';
END
ELSE
BEGIN
    PRINT 'Tabla USERS ya existe';
END

-- Crear tabla PERMISSIONS
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PERMISSIONS' AND xtype='U')
BEGIN
    CREATE TABLE PERMISSIONS (
        Id int IDENTITY(1,1) PRIMARY KEY,
        Name varchar(255) NOT NULL UNIQUE,
        Description varchar(500) NULL,
        CreatedAt datetime NOT NULL DEFAULT GETDATE()
    );
    
    PRINT 'Tabla PERMISSIONS creada exitosamente';
END
ELSE
BEGIN
    PRINT 'Tabla PERMISSIONS ya existe';
END

-- Crear tabla PERMISSIONS_BY_USER (tabla de relación muchos a muchos)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PERMISSIONS_BY_USER' AND xtype='U')
BEGIN
    CREATE TABLE PERMISSIONS_BY_USER (
        Id int IDENTITY(1,1) PRIMARY KEY,
        UserId int NOT NULL,
        PermissionId int NOT NULL,
        AssignedAt datetime NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (UserId) REFERENCES USERS(Id) ON DELETE CASCADE,
        FOREIGN KEY (PermissionId) REFERENCES PERMISSIONS(Id) ON DELETE CASCADE,
        UNIQUE(UserId, PermissionId)
    );
    
    PRINT 'Tabla PERMISSIONS_BY_USER creada exitosamente';
END
ELSE
BEGIN
    PRINT 'Tabla PERMISSIONS_BY_USER ya existe';
END

-- Insertar permisos básicos del sistema
IF NOT EXISTS (SELECT * FROM PERMISSIONS WHERE Name = 'view_upload')
BEGIN
    INSERT INTO PERMISSIONS (Name, Description) VALUES 
    ('view_upload', 'Acceso al módulo de carga de archivos'),
    ('view_dashboard', 'Acceso al dashboard general'),
    ('manage_users', 'Gestión de usuarios del sistema'),
    ('view_admin_panel', 'Acceso al panel de administración');
    
    PRINT 'Permisos básicos insertados exitosamente';
END
ELSE
BEGIN
    PRINT 'Permisos básicos ya existen';
END

-- Insertar permisos fijos del sistema
IF NOT EXISTS (SELECT * FROM PERMISSIONS WHERE Name = 'ADMIN_PANEL')
BEGIN
    INSERT INTO PERMISSIONS (Name, Description) VALUES 
    ('ADMIN_PANEL', 'Acceso al panel de administración'),
    ('DOCUMENT_UPLOAD', 'Subir documentos'),
    ('MANAGEMENT_DASHBOARD', 'Acceso al dashboard de gestión'),
    ('HISTORY_LOAD_COMMERCIAL_FILES', 'Ver historial de carga de archivos comerciales');
    PRINT 'Permisos fijos insertados exitosamente';
END
ELSE
BEGIN
    PRINT 'Permisos fijos ya existen';
END

-- Crear usuario administrador por defecto (solo si no existe)
IF NOT EXISTS (SELECT * FROM USERS WHERE Email = 'admin@claromedia.com')
BEGIN
    -- Hash de la contraseña 'admin123' usando bcrypt
    INSERT INTO USERS (Name, Email, PasswordHash, Status) 
    VALUES ('Administrador Sistema', 'admin@claromedia.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qK', 1);
    
    DECLARE @AdminUserId int = SCOPE_IDENTITY();
    
    -- Asignar todos los permisos al administrador
    INSERT INTO PERMISSIONS_BY_USER (UserId, PermissionId)
    SELECT @AdminUserId, Id FROM PERMISSIONS;
    
    PRINT 'Usuario administrador creado exitosamente';
END
ELSE
BEGIN
    PRINT 'Usuario administrador ya existe';
END

-- Crear índices para optimizar consultas
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_USERS_Email')
BEGIN
    CREATE INDEX IX_USERS_Email ON USERS(Email);
    PRINT 'Índice IX_USERS_Email creado';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PERMISSIONS_BY_USER_UserId')
BEGIN
    CREATE INDEX IX_PERMISSIONS_BY_USER_UserId ON PERMISSIONS_BY_USER(UserId);
    PRINT 'Índice IX_PERMISSIONS_BY_USER_UserId creado';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_USERS_LastAccess')
BEGIN
    CREATE INDEX IX_USERS_LastAccess ON USERS(LastAccess);
    PRINT 'Índice IX_USERS_LastAccess creado';
END

-- Crear tabla LoadDocumentsOCbyUser
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='LoadDocumentsOCbyUser' AND xtype='U')
BEGIN
    CREATE TABLE LoadDocumentsOCbyUser (
        Id int IDENTITY(1,1) PRIMARY KEY,
        IdUser int NOT NULL,
        IdFolder uniqueidentifier NOT NULL,
        Fecha datetime NOT NULL DEFAULT GETDATE(),
        Status varchar(50) NULL,
        FileName varchar(255) NOT NULL,
        FOREIGN KEY (IdUser) REFERENCES USERS(Id)
    );
    PRINT 'Tabla LoadDocumentsOCbyUser creada exitosamente';
END
ELSE
BEGIN
    PRINT 'Tabla LoadDocumentsOCbyUser ya existe';
END

PRINT 'Configuración de base de datos completada exitosamente';
PRINT 'Usuario administrador: admin@claromedia.com';
PRINT 'Contraseña: admin123';
PRINT 'Recuerde cambiar la contraseña después del primer login';
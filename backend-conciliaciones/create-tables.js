const sql = require('mssql');
const fs = require('fs');
require('dotenv').config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
  }
};

async function createTables() {
  try {
    console.log('Conectando a la base de datos...');
    await sql.connect(config);
    
    console.log('\n=== Creando tabla USERS ===');
    await sql.query(`
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
    `);
    
    console.log('\n=== Creando tabla PERMISSIONS ===');
    await sql.query(`
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
    `);
    
    console.log('\n=== Creando tabla PERMISSIONS_BY_USER ===');
    await sql.query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PERMISSIONS_BY_USER' AND xtype='U')
      BEGIN
          CREATE TABLE PERMISSIONS_BY_USER (
              Id int IDENTITY(1,1) PRIMARY KEY,
              UserId int NOT NULL,
              PermissionId int NOT NULL,
              GrantedAt datetime NOT NULL DEFAULT GETDATE(),
              GrantedBy int NULL,
              FOREIGN KEY (UserId) REFERENCES USERS(Id) ON DELETE CASCADE,
              FOREIGN KEY (PermissionId) REFERENCES PERMISSIONS(Id) ON DELETE CASCADE,
              FOREIGN KEY (GrantedBy) REFERENCES USERS(Id),
              UNIQUE(UserId, PermissionId)
          );
          
          PRINT 'Tabla PERMISSIONS_BY_USER creada exitosamente';
      END
      ELSE
      BEGIN
          PRINT 'Tabla PERMISSIONS_BY_USER ya existe';
      END
    `);
    
    console.log('\n=== Creando tabla LoadDocumentsOCbyUser ===');
    await sql.query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='LoadDocumentsOCbyUser' AND xtype='U')
      BEGIN
          CREATE TABLE LoadDocumentsOCbyUser (
              Id int IDENTITY(1,1) PRIMARY KEY,
              IdUser int NOT NULL,
              IdFolder int NOT NULL,
              Fecha datetime NOT NULL DEFAULT GETDATE(),
              Status varchar(50) NULL,
              FOREIGN KEY (IdUser) REFERENCES USERS(Id)
              -- IdFolder puede referenciar otra tabla si existe, ajustar según modelo
          );
          PRINT 'Tabla LoadDocumentsOCbyUser creada exitosamente';
      END
      ELSE
      BEGIN
          PRINT 'Tabla LoadDocumentsOCbyUser ya existe';
      END
    `);
    
    console.log('\n=== Insertando permisos por defecto ===');
    await sql.query(`
      IF NOT EXISTS (SELECT * FROM PERMISSIONS WHERE Name = 'CREATE_USER')
      BEGIN
          INSERT INTO PERMISSIONS (Name, Description) VALUES 
          ('CREATE_USER', 'Crear nuevos usuarios'),
          ('DELETE_USER', 'Eliminar usuarios'),
          ('EDIT_USER', 'Editar información de usuarios'),
          ('VIEW_USERS', 'Ver lista de usuarios'),
          ('MANAGE_PERMISSIONS', 'Gestionar permisos de usuarios'),
          ('VIEW_REPORTS', 'Ver reportes del sistema'),
          ('EXPORT_DATA', 'Exportar datos del sistema'),
          ('SYSTEM_CONFIG', 'Configurar parámetros del sistema');
          
          PRINT 'Permisos por defecto insertados';
      END
      ELSE
      BEGIN
          PRINT 'Permisos por defecto ya existen';
      END
    `);
    
    // Verificar tablas creadas
    console.log('\n=== Verificando tablas creadas ===');
    const tablesResult = await sql.query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      AND TABLE_NAME IN ('USERS', 'PERMISSIONS', 'PERMISSIONS_BY_USER')
      ORDER BY TABLE_NAME
    `);
    
    console.log('Tablas creadas:');
    tablesResult.recordset.forEach(table => {
      console.log(`✅ ${table.TABLE_NAME}`);
    });
    
    // Verificar estructura de USERS
    console.log('\n=== Estructura de tabla USERS ===');
    const columnsResult = await sql.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'USERS'
      ORDER BY ORDINAL_POSITION
    `);
    
    columnsResult.recordset.forEach(col => {
      console.log(`- ${col.COLUMN_NAME} (${col.DATA_TYPE}) - Nullable: ${col.IS_NULLABLE}`);
    });
    
    console.log('\n✅ Configuración de base de datos completada');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.close();
  }
}

createTables();
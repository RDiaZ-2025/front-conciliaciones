import 'dotenv/config';
import sql from 'mssql';
import { config } from '../config/database';

async function setupMenuManagement() {
  try {
    console.log('Conectando a la base de datos...');
    const pool = await sql.connect(config);

    // 1. Insert Permission
    const permissionName = 'manage_menus';
    const permissionDesc = 'Gestión de Menús';

    console.log(`Verificando permiso: ${permissionName}`);
    // Table: Permissions
    let permResult = await pool.request()
      .input('Name', sql.VarChar, permissionName)
      .query('SELECT Id FROM Permissions WHERE Name = @Name');

    let permissionId;

    if (permResult.recordset.length === 0) {
      await pool.request()
        .input('Name', sql.VarChar, permissionName)
        .input('Description', sql.VarChar, permissionDesc)
        .query('INSERT INTO Permissions (Name, Description) VALUES (@Name, @Description)');
      console.log(`Permiso '${permissionName}' insertado.`);

      // Fetch again
      permResult = await pool.request()
        .input('Name', sql.VarChar, permissionName)
        .query('SELECT Id FROM Permissions WHERE Name = @Name');
      permissionId = permResult.recordset[0].Id;
    } else {
      console.log(`Permiso '${permissionName}' ya existe.`);
      permissionId = permResult.recordset[0].Id;
    }

    // 2. Create MENU_ITEMS table if not exists
    console.log('Verificando tabla MENU_ITEMS...');
    const checkTable = await pool.request()
      .query("SELECT * FROM sysobjects WHERE name='MENU_ITEMS' AND xtype='U'");

    if (checkTable.recordset.length === 0) {
      console.log('Creando tabla MENU_ITEMS...');
      await pool.request().query(`
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
        CREATE INDEX IX_MENU_ITEMS_DisplayOrder ON MENU_ITEMS(displayOrder, isActive);
      `);
      console.log('Tabla MENU_ITEMS creada.');
    }

    // 3. Insert Menu Item
    const label = 'Gestión de Menús';
    const route = '/menu-management'; // Matches App.jsx
    const icon = 'MenuBookIcon';
    const displayOrder = 99;

    console.log(`Verificando menú: ${label}`);
    // Table: MENU_ITEMS
    // Note: Check if table exists just in case, but we assume it does based on sql script
    const menuResult = await pool.request()
      .input('Label', sql.VarChar, label)
      .query('SELECT id FROM MENU_ITEMS WHERE label = @Label');

    if (menuResult.recordset.length === 0) {
      await pool.request()
        .input('Label', sql.VarChar, label)
        .input('Icon', sql.VarChar, icon)
        .input('Route', sql.VarChar, route)
        .input('DisplayOrder', sql.Int, displayOrder)
        .input('IsActive', sql.Bit, 1)
        .query(`
          INSERT INTO MENU_ITEMS (label, icon, route, displayOrder, isActive) 
          VALUES (@Label, @Icon, @Route, @DisplayOrder, @IsActive)
        `);
      console.log(`Menú '${label}' insertado.`);
    } else {
      console.log(`Menú '${label}' ya existe.`);
    }

    // 3. Assign Permission to All Users
    console.log('Asignando permisos a todos los usuarios...');
    // Table: Users
    const usersResult = await pool.request()
      .query('SELECT Id, Email FROM Users');

    console.log(`Se encontraron ${usersResult.recordset.length} usuarios.`);

    for (const user of usersResult.recordset) {
      await assignToUser(pool, user.Id, permissionId, user.Email);
    }

    console.log('Proceso completado exitosamente.');
    process.exit(0);
  } catch (error) {
    console.error('Error en el proceso de setup:', error);
    process.exit(1);
  }
}

async function assignToUser(pool: sql.ConnectionPool, userId: number, permissionId: number, email: string) {
  // Table: PermissionsByUser
  const check = await pool.request()
    .input('UserId', sql.Int, userId)
    .input('PermissionId', sql.Int, permissionId)
    .query('SELECT * FROM PermissionsByUser WHERE UserId = @UserId AND PermissionId = @PermissionId');

  if (check.recordset.length === 0) {
    await pool.request()
      .input('UserId', sql.Int, userId)
      .input('PermissionId', sql.Int, permissionId)
      .query('INSERT INTO PermissionsByUser (UserId, PermissionId) VALUES (@UserId, @PermissionId)');
    console.log(`Permiso asignado al usuario ${email} (ID: ${userId})`);
  } else {
    console.log(`Usuario ${email} (ID: ${userId}) ya tiene el permiso`);
  }
}

setupMenuManagement();


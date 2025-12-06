import 'dotenv/config';
import sql from 'mssql';
import { config } from '../config/database';

async function seedPortada15Minutos() {
  try {
    console.log('Conectando a la base de datos...');
    const pool = await sql.connect(config);

    // 1. Insert Permission
    const permissionName = 'portada_15_minutos';
    const permissionDesc = 'Portada 15 Minutos';
    
    console.log(`Verificando permiso: ${permissionName}`);
    const permResult = await pool.request()
      .input('Name', sql.VarChar, permissionName)
      .query('SELECT Id FROM Permissions WHERE Name = @Name');

    if (permResult.recordset.length === 0) {
      await pool.request()
        .input('Name', sql.VarChar, permissionName)
        .input('Description', sql.VarChar, permissionDesc)
        .query('INSERT INTO Permissions (Name, Description) VALUES (@Name, @Description)');
      console.log(`Permiso '${permissionName}' insertado.`);
    } else {
      console.log(`Permiso '${permissionName}' ya existe.`);
    }

    // 2. Insert Menu Item
    const label = 'Portada 15 Minutos';
    const route = '/portada-15-minutos'; // This route is not directly used by App.jsx but good for reference
    const icon = 'ImageIcon';
    const displayOrder = 6; // After 'Usuarios' which is likely 5

    console.log(`Verificando menú: ${label}`);
    const menuResult = await pool.request()
      .input('Label', sql.VarChar, label)
      .query('SELECT Id FROM MenuItems WHERE Label = @Label');

    if (menuResult.recordset.length === 0) {
      await pool.request()
        .input('Label', sql.VarChar, label)
        .input('Icon', sql.VarChar, icon)
        .input('Route', sql.VarChar, route)
        .input('DisplayOrder', sql.Int, displayOrder)
        .input('IsActive', sql.Bit, 1)
        .query(`
          INSERT INTO MenuItems (Label, Icon, Route, DisplayOrder, IsActive) 
          VALUES (@Label, @Icon, @Route, @DisplayOrder, @IsActive)
        `);
      console.log(`Menú '${label}' insertado.`);
    } else {
      console.log(`Menú '${label}' ya existe.`);
    }

    console.log('Proceso completado exitosamente.');
    process.exit(0);
  } catch (error) {
    console.error('Error en el proceso de seed:', error);
    process.exit(1);
  }
}

seedPortada15Minutos();

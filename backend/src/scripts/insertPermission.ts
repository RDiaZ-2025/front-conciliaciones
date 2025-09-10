import 'dotenv/config';
import sql from 'mssql';
import { config } from '../config/database';

const [,, name, description] = process.argv;

if (!name || !description) {
  console.error('Uso: ts-node insertPermission.ts <NAME> <DESCRIPTION>');
  process.exit(1);
}

async function insertPermission() {
  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('Name', sql.VarChar, name)
      .input('Description', sql.VarChar, description)
      .query('INSERT INTO PERMISSIONS (Name, Description) VALUES (@Name, @Description)');
    console.log(`Permiso '${name}' insertado correctamente.`);
    process.exit(0);
  } catch (error) {
    console.error('Error al insertar el permiso:', error);
    process.exit(1);
  }
}

insertPermission();
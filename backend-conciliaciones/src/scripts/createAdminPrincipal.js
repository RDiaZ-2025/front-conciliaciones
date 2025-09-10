require('dotenv/config');
const { connectDB, getPool, sql } = require('../../dist/config/database');
const bcrypt = require('bcryptjs');

async function createAdminPrincipal() {
  await connectDB();
  const pool = getPool();
  if (!pool) {
    console.error('Base de datos no disponible');
    process.exit(1);
  }
  try {
    const email = 'ADMINPRINCIPAL@test.com';
    const password = 'Conciliaciones2024!'; // Clave segura
    const hashedPassword = await bcrypt.hash(password, 10);
    // Verificar si el usuario ya existe
    const userResult = await pool.request()
      .input('email', sql.VarChar, email)
      .query('SELECT Id FROM USERS WHERE Email = @email');
    let userId;
    if (userResult.recordset.length === 0) {
      // Crear usuario
      const insertUser = await pool.request()
        .input('email', sql.VarChar, email)
        .input('passwordHash', sql.VarChar, hashedPassword)
        .input('name', sql.VarChar, 'ADMINPRINCIPAL')
        .input('status', sql.Int, 1)
        .query('INSERT INTO USERS (Email, PasswordHash, Name, Status) OUTPUT INSERTED.Id VALUES (@email, @passwordHash, @name, @status)');
      userId = insertUser.recordset[0].Id;
    } else {
      userId = userResult.recordset[0].Id;
      // Asegurar que el usuario esté habilitado
      await pool.request()
        .input('userId', sql.Int, userId)
        .input('status', sql.Int, 1)
        .query('UPDATE USERS SET Status = @status WHERE Id = @userId');
    }
    // Obtener todos los permisos
    const permResult = await pool.request().query('SELECT Id FROM PERMISSIONS');
    // Eliminar permisos existentes
    await pool.request()
      .input('userId', sql.Int, userId)
      .query('DELETE FROM PERMISSIONS_BY_USER WHERE UserId = @userId');
    // Asignar todos los permisos
    for (const perm of permResult.recordset) {
      await pool.request()
        .input('userId', sql.Int, userId)
        .input('permissionId', sql.Int, perm.Id)
        .query('INSERT INTO PERMISSIONS_BY_USER (UserId, PermissionId) VALUES (@userId, @permissionId)');
    }
    console.log('Usuario ADMINPRINCIPAL creado con todos los permisos. Clave: Conciliaciones2024!');
    process.exit(0);
  } catch (error) {
    console.error('Error creando usuario ADMINPRINCIPAL:', error);
    process.exit(1);
  }
}

createAdminPrincipal();
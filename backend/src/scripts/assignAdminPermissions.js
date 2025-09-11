require('dotenv/config');
const { connectDB, getPool, sql } = require('../../dist/config/database');

async function assignAdminPermissions(email, permissions) {
  await connectDB();
  const pool = getPool();
  if (!pool) {
    console.error('Base de datos no disponible');
    process.exit(1);
  }
  try {
    // Obtener el usuario por email
    const userResult = await pool.request()
      .input('email', sql.VarChar, email)
      .query('SELECT Id FROM USERS WHERE Email = @email');
    if (userResult.recordset.length === 0) {
      console.error('Usuario no encontrado:', email);
      process.exit(1);
    }
    const userId = userResult.recordset[0].Id;
    // Eliminar permisos existentes
    await pool.request()
      .input('userId', sql.Int, userId)
      .query('DELETE FROM PERMISSIONS_BY_USER WHERE UserId = @userId');
    // Asignar nuevos permisos
    for (const permissionName of permissions) {
      const permResult = await pool.request()
        .input('permissionName', sql.VarChar, permissionName)
        .query('SELECT Id FROM PERMISSIONS WHERE Name = @permissionName');
      if (permResult.recordset.length > 0) {
        const permissionId = permResult.recordset[0].Id;
        await pool.request()
          .input('userId', sql.Int, userId)
          .input('permissionId', sql.Int, permissionId)
          .query('INSERT INTO PERMISSIONS_BY_USER (UserId, PermissionId) VALUES (@userId, @permissionId)');
      } else {
        console.warn('Permiso no encontrado:', permissionName);
      }
    }
    console.log('Permisos asignados correctamente al usuario', email);
    process.exit(0);
  } catch (error) {
    console.error('Error asignando permisos:', error);
    process.exit(1);
  }
}

// Permisos administrativos requeridos
const adminPermissions = [
  'admin_panel',
  'document_upload',
  'management_dashboard',
  'historial_carga_archivos_comerciales'
];

// Ejecutar script
assignAdminPermissions('adminpanel@test.com', adminPermissions);
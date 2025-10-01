require('dotenv/config');
const { connectDB, getPool, sql } = require('../../dist/config/database');
const bcrypt = require('bcryptjs');

async function createAdminPanelUser() {
  await connectDB();
  const pool = getPool();
  if (!pool) {
    console.error('Base de datos no disponible');
    process.exit(1);
  }
  try {
    const email = 'adminpanel@test.com';
    const password = '123456'; // Password from insert-users.sql
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Check if user already exists
    const userResult = await pool.request()
      .input('email', sql.VarChar, email)
      .query('SELECT Id FROM USERS WHERE Email = @email');
    
    let userId;
    if (userResult.recordset.length === 0) {
      // Create user
      const insertUser = await pool.request()
        .input('email', sql.VarChar, email)
        .input('passwordHash', sql.VarChar, hashedPassword)
        .input('name', sql.VarChar, 'Admin Panel Test')
        .input('status', sql.Int, 1)
        .query('INSERT INTO USERS (Email, PasswordHash, Name, Status) OUTPUT INSERTED.Id VALUES (@email, @passwordHash, @name, @status)');
      userId = insertUser.recordset[0].Id;
      console.log('Usuario adminpanel@test.com creado exitosamente');
    } else {
      userId = userResult.recordset[0].Id;
      console.log('Usuario adminpanel@test.com ya existe');
      // Ensure user is enabled
      await pool.request()
        .input('userId', sql.Int, userId)
        .input('status', sql.Int, 1)
        .query('UPDATE USERS SET Status = @status WHERE Id = @userId');
    }
    
    // Get all permissions including PRODUCTION
    const permissionNames = [
      'ADMIN_PANEL',
      'DOCUMENT_UPLOAD',
      'MANAGEMENT_DASHBOARD',
      'HISTORY_LOAD_COMMERCIAL_FILES',
      'PRODUCTION'
    ];
    
    // Remove existing permissions
    await pool.request()
      .input('userId', sql.Int, userId)
      .query('DELETE FROM PERMISSIONS_BY_USER WHERE UserId = @userId');
    
    // Assign permissions
    for (const permissionName of permissionNames) {
      const permResult = await pool.request()
        .input('permissionName', sql.VarChar, permissionName)
        .query('SELECT Id FROM PERMISSIONS WHERE Name = @permissionName');
      
      if (permResult.recordset.length > 0) {
        const permissionId = permResult.recordset[0].Id;
        await pool.request()
          .input('userId', sql.Int, userId)
          .input('permissionId', sql.Int, permissionId)
          .query('INSERT INTO PERMISSIONS_BY_USER (UserId, PermissionId) VALUES (@userId, @permissionId)');
        console.log(`Permiso ${permissionName} asignado`);
      } else {
        console.warn(`Permiso no encontrado: ${permissionName}`);
      }
    }
    
    console.log('Permisos asignados correctamente al usuario adminpanel@test.com');
    console.log('Credenciales: adminpanel@test.com / 123456');
    process.exit(0);
  } catch (error) {
    console.error('Error creando usuario adminpanel@test.com:', error);
    process.exit(1);
  }
}

createAdminPanelUser();
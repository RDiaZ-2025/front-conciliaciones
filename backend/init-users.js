const sql = require('mssql');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
    requestTimeout: 30000,
    connectionTimeout: 15000,
  }
};

async function initializeUsers() {
  try {
    console.log('🔄 Conectando a la base de datos...');
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    console.log('✅ Conectado exitosamente');

    // Hash para la contraseña 'admin123'
    const passwordHash = await bcrypt.hash('admin123', 12);

    // Verificar si el usuario admin@test.com ya existe
    const existingUser = await pool.request()
      .input('email', sql.VarChar, 'admin@test.com')
      .query('SELECT Id FROM USERS WHERE Email = @email');

    if (existingUser.recordset.length === 0) {
      // Crear usuario admin@test.com
      const insertResult = await pool.request()
        .input('name', sql.VarChar, 'Administrador Test')
        .input('email', sql.VarChar, 'admin@test.com')
        .input('passwordHash', sql.VarChar, passwordHash)
        .input('status', sql.Int, 1)
        .query(`
          INSERT INTO USERS (Name, Email, PasswordHash, Status) 
          OUTPUT INSERTED.Id
          VALUES (@name, @email, @passwordHash, @status)
        `);

      const userId = insertResult.recordset[0].Id;
      console.log(`✅ Usuario admin@test.com creado con ID: ${userId}`);

      // Obtener todos los permisos
      const permissions = await pool.request().query('SELECT Id FROM PERMISSIONS');
      
      // Asignar todos los permisos al usuario admin
      for (const permission of permissions.recordset) {
        await pool.request()
          .input('userId', sql.Int, userId)
          .input('permissionId', sql.Int, permission.Id)
          .query('INSERT INTO PERMISSIONS_BY_USER (UserId, PermissionId) VALUES (@userId, @permissionId)');
      }
      
      console.log(`✅ Permisos asignados al usuario admin@test.com`);
    } else {
      console.log('ℹ️ Usuario admin@test.com ya existe');
    }

    await pool.close();
    console.log('\n✅ Inicialización de usuarios completada');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

initializeUsers();
const sql = require('mssql');
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

async function setupDatabase() {
  try {
    console.log('🔄 Conectando a la base de datos...');
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    console.log('✅ Conectado exitosamente');

    // Verificar si las tablas existen
    console.log('\n🔍 Verificando tablas existentes...');
    const tablesResult = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);
    
    console.log('📋 Tablas encontradas:');
    tablesResult.recordset.forEach(table => {
      console.log(`  - ${table.TABLE_NAME}`);
    });

    // Verificar estructura de tabla USERS si existe
    const usersCheck = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'USERS'
      ORDER BY ORDINAL_POSITION
    `);
    
    if (usersCheck.recordset.length > 0) {
      console.log('\n📊 Estructura de tabla USERS:');
      usersCheck.recordset.forEach(col => {
        console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'})`);
      });
    } else {
      console.log('\n❌ Tabla USERS no encontrada');
    }

    await pool.close();
    console.log('\n✅ Verificación completada');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setupDatabase();
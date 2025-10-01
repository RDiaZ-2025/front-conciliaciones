const sql = require('mssql');
const fs = require('fs');
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

async function createProductionTable() {
  try {
    console.log('🔄 Connecting to database...');
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    console.log('✅ Connected successfully');

    // Read the SQL script
    const sqlScript = fs.readFileSync('./create-production-table.sql', 'utf8');
    
    console.log('🔄 Creating production_requests table...');
    
    // Execute the SQL script
    await pool.request().query(sqlScript);
    
    console.log('✅ Production table setup completed');
    
    // Verify the table was created
    const checkResult = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'production_requests'
      ORDER BY ORDINAL_POSITION
    `);
    
    if (checkResult.recordset.length > 0) {
      console.log('\n📊 production_requests table structure:');
      checkResult.recordset.forEach(col => {
        console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'})`);
      });
    }
    
    await pool.close();
    console.log('\n✅ Setup completed successfully');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createProductionTable();
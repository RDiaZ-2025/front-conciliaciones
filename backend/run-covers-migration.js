const sql = require('mssql');
const fs = require('fs');
const path = require('path');
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
    enableArithAbort: true
  }
};

async function runMigration() {
  try {
    console.log('Connecting to database...');
    const pool = await sql.connect(config);
    console.log('Connected.');

    const sqlFilePath = path.join(__dirname, 'scripts', 'create-covers-table.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Split by GO if necessary, but simple execution might work if mssql supports it or if we strip GO
    // mssql driver usually executes batches. If 'GO' is present, we might need to split.
    const batches = sqlContent.split('GO').filter(batch => batch.trim().length > 0);

    for (const batch of batches) {
        console.log('Executing batch...');
        await pool.request().query(batch);
    }

    console.log('Migration completed successfully.');
    await pool.close();
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

runMigration();

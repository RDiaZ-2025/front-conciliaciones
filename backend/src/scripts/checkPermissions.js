require('dotenv/config');
const { connectDB, getPool, sql } = require('../../dist/config/database');

async function checkPermissions() {
  await connectDB();
  const pool = getPool();
  if (!pool) {
    console.error('Base de datos no disponible');
    process.exit(1);
  }
  try {
    const result = await pool.request().query('SELECT Name, Description FROM PERMISSIONS ORDER BY Name');
    console.log('Permisos disponibles en la base de datos:');
    result.recordset.forEach(perm => {
      console.log(`- ${perm.Name}: ${perm.Description}`);
    });
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkPermissions();
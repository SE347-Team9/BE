const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'distribution_db',
  password: '010171',
  port: 5432
});

async function checkColumns() {
  try {
    const distCols = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'ordermgmt' AND table_name = 'distribution'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Columns in ordermgmt.distribution:');
    distCols.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkColumns();

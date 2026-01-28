const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'distribution_db',
  password: '010171',
  port: 5432
});

async function checkAuthAccount() {
  try {
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'auth' AND table_name = 'account'
    `);
    
    if (tableCheck.rows.length === 0) {
      console.log('❌ Table auth.account does NOT exist!');
      await pool.end();
      return;
    }
    
    console.log('✅ Table auth.account exists');
    
    // Get columns
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'auth' AND table_name = 'account'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Columns:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkAuthAccount();

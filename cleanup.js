const pool = require('./src/config/database');

async function cleanup() {
  try {
    console.log('🔍 Checking for existing PX codes...');
    
    const existing = await pool.query(`
      SELECT distribution_code FROM ordermgmt.distribution 
      WHERE distribution_code LIKE 'PX%'
      ORDER BY distribution_code
    `);
    
    console.log(`Found ${existing.rows.length} existing PX codes:`);
    existing.rows.forEach(r => console.log(`  - ${r.distribution_code}`));
    
    // Delete PNHAN orders
    console.log('\n🗑️  Deleting PNHAN orders...');
    const deleteResult = await pool.query('DELETE FROM ordermgmt.distribution WHERE distribution_code LIKE \'PNHAN%\'');
    console.log(`✅ Deleted ${deleteResult.rowCount} PNHAN orders`);
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

cleanup();

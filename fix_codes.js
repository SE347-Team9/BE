const pool = require('./src/config/database');

async function fixDistributionCodes() {
  try {
    console.log('\n🔧 Fixing distribution codes from PNHAN to PX prefix...');
    
    // Get current PNHAN orders
    const current = await pool.query(`
      SELECT distribution_id, distribution_code FROM ordermgmt.distribution 
      WHERE distribution_code LIKE 'PNHAN%'
      ORDER BY distribution_code
    `);
    
    console.log(`\n📦 Found ${current.rows.length} orders to update`);
    
    // Update codes to PX prefix
    for (const row of current.rows) {
      const newCode = row.distribution_code.replace('PNHAN', 'PX');
      await pool.query(
        'UPDATE ordermgmt.distribution SET distribution_code = $1 WHERE distribution_id = $2',
        [newCode, row.distribution_id]
      );
      console.log(`  ✅ Updated ${row.distribution_code} → ${newCode}`);
    }
    
    // Verify
    console.log('\n✅ Verification:');
    const updated = await pool.query(`
      SELECT d.distribution_code, d.agency_id, a.name, d.status, COUNT(dd.distribution_detail_id) as items
      FROM ordermgmt.distribution d
      LEFT JOIN ordermgmt.distribution_detail dd ON d.distribution_id = dd.distribution_id
      WHERE d.distribution_code LIKE 'PX%'
      GROUP BY d.distribution_id, a.name
      ORDER BY d.distribution_code
    `);
    
    console.log('\n📊 Updated Distribution Orders:');
    console.log('─'.repeat(90));
    updated.rows.forEach(o => {
      console.log(`${o.distribution_code} | Agency: ${o.name} | Status: ${o.status} | Items: ${o.items}`);
    });
    console.log('─'.repeat(90));
    console.log(`\nTotal: ${updated.rows.length} orders ready for agency to view`);
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

fixDistributionCodes();

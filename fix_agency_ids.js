const pool = require('./src/config/database');

async function checkAndFix() {
  try {
    // Check current receive orders
    const orders = await pool.query(`
      SELECT distribution_id, distribution_code, agency_id FROM ordermgmt.distribution 
      WHERE distribution_code LIKE 'PNHAN%'
      ORDER BY distribution_code
    `);
    
    console.log('\n📦 Current Receive Orders:');
    orders.rows.forEach(o => {
      console.log(`${o.distribution_code} - Agency ID: ${o.agency_id}`);
    });
    
    // Fix the agency IDs - update to correct ones
    console.log('\n🔧 Fixing agency IDs...');
    
    // Map old agency IDs to correct ones
    // agency_id 1 -> 15 (DL001 - Đại lý Nghĩa)
    // agency_id 2 -> 16 (DL002 - Đại lý Tim)
    // agency_id 3 -> 17 (DL003 - Đại lý Tí)
    
    await pool.query(`
      UPDATE ordermgmt.distribution 
      SET agency_id = 15 
      WHERE distribution_code IN ('PNHAN001', 'PNHAN002', 'PNHAN003')
    `);
    console.log('✅ Updated PNHAN001-PNHAN003 to agency_id 15 (DL001 - Đại lý Nghĩa)');
    
    await pool.query(`
      UPDATE ordermgmt.distribution 
      SET agency_id = 16 
      WHERE distribution_code IN ('PNHAN004', 'PNHAN005')
    `);
    console.log('✅ Updated PNHAN004-PNHAN005 to agency_id 16 (DL002 - Đại lý Tim)');
    
    await pool.query(`
      UPDATE ordermgmt.distribution 
      SET agency_id = 17 
      WHERE distribution_code IN ('PNHAN006', 'PNHAN007', 'PNHAN008', 'PNHAN009', 'PNHAN010')
    `);
    console.log('✅ Updated PNHAN006-PNHAN010 to agency_id 17 (DL003 - Đại lý Tí)');
    
    // Verify
    console.log('\n✅ Updated Orders:');
    const updated = await pool.query(`
      SELECT d.distribution_code, d.agency_id, a.name, d.status 
      FROM ordermgmt.distribution d
      LEFT JOIN master.agency a ON d.agency_id = a.agency_id
      WHERE d.distribution_code LIKE 'PNHAN%'
      ORDER BY d.distribution_code
    `);
    
    updated.rows.forEach(o => {
      console.log(`${o.distribution_code} - Agency: ${o.name} (ID: ${o.agency_id}) - Status: ${o.status}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkAndFix();

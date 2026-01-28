const pool = require('./src/config/database');

async function checkDistribution() {
  try {
    console.log('\n========== KIỂM TRA DISTRIBUTION TABLE ==========\n');

    const result = await pool.query(`
      SELECT 
        distribution_id,
        distribution_code,
        agency_id,
        total_amount,
        status,
        created_at
      FROM ordermgmt.distribution
      LIMIT 20
    `);

    console.log('Tổng records:', result.rows.length);
    console.log('\nSample data:');
    result.rows.forEach(row => {
      console.log(`ID: ${row.distribution_id}, Code: ${row.distribution_code}, Agency: ${row.agency_id}, Amount: ${row.total_amount}, Status: ${row.status}`);
    });

    await pool.end();
    console.log('\n✅ Done\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkDistribution();

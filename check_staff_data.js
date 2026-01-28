const pool = require('./src/config/database');

async function checkData() {
  try {
    console.log('\n========== KIỂM TRA DỮ LIỆU DATABASE ==========\n');

    // Check agencies
    const agencies = await pool.query('SELECT COUNT(*) as count FROM master.agency');
    console.log('📍 Tổng số đại lý:', agencies.rows[0].count);

    // Check distribution
    const distribution = await pool.query('SELECT COUNT(*) as count FROM ordermgmt.distribution');
    console.log('📦 Tổng số distribution:', distribution.rows[0].count);

    // Check receive_order
    const receives = await pool.query('SELECT COUNT(*) as count FROM warehouse.receive_order');
    console.log('📥 Tổng số receive_order:', receives.rows[0].count);

    // Check payments
    const payments = await pool.query('SELECT COUNT(*) as count FROM finance.payment');
    console.log('💰 Tổng số payment:', payments.rows[0].count);

    // Check payment status
    const pendingPayments = await pool.query('SELECT COUNT(*) as count FROM finance.payment WHERE status = $1', ['pending']);
    console.log('  - Pending:', pendingPayments.rows[0].count);

    const completedPayments = await pool.query('SELECT COUNT(*) as count FROM finance.payment WHERE status = $1', ['completed']);
    console.log('  - Completed:', completedPayments.rows[0].count);

    console.log('\n========== CHI TIẾT DỮ LIỆU ==========\n');

    // Sample agencies
    console.log('📋 Sample Agencies:');
    const agenciesList = await pool.query('SELECT agency_id, code, name FROM master.agency LIMIT 5');
    agenciesList.rows.forEach(a => console.log(`  - ${a.code}: ${a.name}`));

    // Sample distribution
    console.log('\n📋 Sample Distribution:');
    const distList = await pool.query('SELECT distribution_id, distribution_code, total_amount FROM ordermgmt.distribution LIMIT 5');
    distList.rows.forEach(d => console.log(`  - ${d.distribution_code}: ${d.total_amount}`));

    await pool.end();
    console.log('\n✅ Kiểm tra xong\n');
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    process.exit(1);
  }
}

checkData();

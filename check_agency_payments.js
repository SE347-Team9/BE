const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'distribution_db',
  password: '010171',
  port: 5432
});

async function checkAgencyPayments() {
  try {
    // Get agencies DL004-DL011
    const agencies = await pool.query(`
      SELECT agency_id, code, name, level
      FROM master.agency
      WHERE code IN ('DL004', 'DL005', 'DL006', 'DL007', 'DL008', 'DL009', 'DL010', 'DL011')
      ORDER BY code
    `);
    
    console.log('📊 Kiểm tra doanh số các đại lý:\n');
    
    for (const agency of agencies.rows) {
      // Get payments for this agency
      const payments = await pool.query(`
        SELECT 
          COUNT(*) as total_payments,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
          SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as completed_amount,
          SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount,
          MIN(payment_date) as first_payment,
          MAX(payment_date) as last_payment
        FROM finance.payment
        WHERE agency_id = $1
      `, [agency.agency_id]);
      
      const p = payments.rows[0];
      const monthsDiff = p.first_payment && p.last_payment 
        ? Math.ceil((new Date(p.last_payment) - new Date(p.first_payment)) / (1000 * 60 * 60 * 24 * 30))
        : 0;
      
      console.log(`${agency.code} - ${agency.name} (Cấp ${agency.level})`);
      console.log(`  Tổng payments: ${p.total_payments}`);
      console.log(`  Completed: ${p.completed_count} - ${Number(p.completed_amount).toLocaleString()} đ`);
      console.log(`  Pending: ${Number(p.pending_amount).toLocaleString()} đ`);
      console.log(`  Thời gian: ${monthsDiff} tháng`);
      console.log(`  Tỷ lệ thanh toán: ${p.total_payments > 0 ? Math.round(p.completed_count / p.total_payments * 100) : 0}%\n`);
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkAgencyPayments();

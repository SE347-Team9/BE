const pool = require('./src/config/database');

async function checkAgencies() {
  try {
    console.log('\n========== KIỂM TRA AGENCIES ==========\n');

    // Check agency table
    const agenciesRes = await pool.query(`
      SELECT 
        agency_id as id,
        code,
        name,
        address,
        phone,
        email,
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM master.agency
    `);

    console.log('Total agencies:', agenciesRes.rows.length);
    agenciesRes.rows.forEach(a => {
      console.log(`- ${a.code}: ${a.name}`);
    });

    console.log('\n========== KIỂM TRA PAYMENTS ==========\n');
    
    const paymentsRes = await pool.query(`
      SELECT 
        payment_id,
        code,
        amount,
        status,
        created_at,
        updated_at
      FROM finance.payment
    `);

    console.log('Total payments:', paymentsRes.rows.length);
    console.log('Status breakdown:');
    const pending = paymentsRes.rows.filter(p => p.status === 'pending').length;
    const completed = paymentsRes.rows.filter(p => p.status === 'completed').length;
    console.log(`- Pending: ${pending}`);
    console.log(`- Completed: ${completed}`);

    const pendingAmount = paymentsRes.rows
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + (typeof p.amount === 'string' ? parseFloat(p.amount) : p.amount), 0);
    const completedAmount = paymentsRes.rows
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + (typeof p.amount === 'string' ? parseFloat(p.amount) : p.amount), 0);
    
    console.log(`- Pending amount: ${pendingAmount}`);
    console.log(`- Completed amount: ${completedAmount}`);

    console.log('\n========== KIỂM TRA RECEIVE ORDERS ==========\n');

    const receivesRes = await pool.query(`
      SELECT 
        receive_order_id,
        receive_code,
        supplier_id,
        receive_date,
        total_amount,
        created_at
      FROM warehouse.receive_order
      ORDER BY created_at DESC
    `);

    console.log('Total receive orders:', receivesRes.rows.length);
    receivesRes.rows.forEach(r => {
      console.log(`- ${r.receive_code}: ${r.total_amount}đ (${r.receive_date})`);
    });

    await pool.end();
    console.log('\n✅ Done\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAgencies();

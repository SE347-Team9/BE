const pool = require('./src/config/database');

async function checkSchema() {
  try {
    // Check payment table schema
    const paymentSchema = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'finance' AND table_name = 'payment'
    `);
    
    console.log('Payment table columns:');
    paymentSchema.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type}`);
    });

    console.log('\nReceive order table columns:');
    const receiveSchema = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'warehouse' AND table_name = 'receive_order'
    `);
    receiveSchema.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type}`);
    });

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkSchema();

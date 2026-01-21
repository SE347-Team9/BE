const pool = require('./src/config/database');

async function fixRegulationDescriptions() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Delete all existing regulations
    await client.query('DELETE FROM config.regulation');

    // Insert with proper UTF-8 encoding
    const regulations = [
      ['max_debt_level_1', '100000000', 'Trần nợ đại lý cấp 1', 'number'],
      ['max_debt_level_2', '50000000', 'Trần nợ đại lý cấp 2', 'number'],
      ['max_debt_level_3', '20000000', 'Trần nợ đại lý cấp 3', 'number'],
      ['max_delivery_order', '10', 'Số lượng đơn hàng tối đa trên ngày', 'number'],
      ['max_order_value', '50000000', 'Giá trị đơn hàng tối đa', 'number'],
      ['single_supplier_per_import', '1', 'Một phiếu nhập chỉ chọn được 1 nhà sản xuất', 'number'],
      ['min_sales_level_1', '100000000', 'Doanh số tối thiểu để lên Cấp 1 (VND/tháng)', 'number'],
      ['min_sales_level_2', '50000000', 'Doanh số tối thiểu để lên Cấp 2 (VND/tháng)', 'number'],
      ['min_months_level_1', '6', 'Số tháng hoạt động tối thiểu để lên Cấp 1', 'number'],
      ['min_months_level_2', '3', 'Số tháng hoạt động tối thiểu để lên Cấp 2', 'number'],
      ['min_payment_rate_level_1', '90', 'Tỷ lệ thanh toán đúng hạn tối thiểu để lên Cấp 1 (%)', 'number'],
      ['min_payment_rate_level_2', '80', 'Tỷ lệ thanh toán đúng hạn tối thiểu để lên Cấp 2 (%)', 'number'],
      ['discount_level_1', '5', 'Chiết khấu cho đại lý cấp 1 (%)', 'number'],
      ['discount_level_2', '3', 'Chiết khấu cho đại lý cấp 2 (%)', 'number'],
      ['discount_level_3', '2', 'Chiết khấu cho đại lý cấp 3 (%)', 'number'],
      ['agency_level_1_threshold', '100000000', 'Doanh số tối thiểu để lên Cấp 1', 'number'],
      ['agency_level_2_threshold', '50000000', 'Doanh số tối thiểu để lên Cấp 2', 'number'],
      ['max_debt_ratio', '0.5', 'Tỷ lệ nợ tối đa', 'number'],
      ['min_order_amount', '1000000', 'Giá trị đơn hàng tối thiểu', 'number']
    ];

    for (const [key, value, description, dataType] of regulations) {
      await client.query(
        `INSERT INTO config.regulation (regulation_key, regulation_value, description, data_type, updated_at) 
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
        [key, value, description, dataType]
      );
    }

    await client.query('COMMIT');

    // Verify
    const result = await client.query('SELECT regulation_key, description FROM config.regulation ORDER BY regulation_key');
    console.log('✅ Regulations updated successfully!');
    console.log('\nSample data:');
    result.rows.slice(0, 5).forEach(row => {
      console.log(`  ${row.regulation_key}: ${row.description}`);
    });
    console.log(`\nTotal: ${result.rows.length} regulations`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    pool.end();
  }
}

fixRegulationDescriptions()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

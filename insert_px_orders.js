const pool = require('./src/config/database');

async function insertReceiveOrdersWithPXCode() {
  try {
    console.log('\n🌱 Inserting receive orders with PX codes...\n');

    // Get agencies
    const agenciesResult = await pool.query('SELECT agency_id, code, name FROM master.agency ORDER BY agency_id LIMIT 5');
    const agencies = agenciesResult.rows;

    // Get drivers
    const driversResult = await pool.query('SELECT driver_id FROM master.driver LIMIT 4');
    const drivers = driversResult.rows;

    // Get products
    const productsResult = await pool.query('SELECT product_id FROM master.product LIMIT 10');
    const products = productsResult.rows;

    // Get staff
    const staffResult = await pool.query('SELECT account_id FROM auth.account WHERE role = \'staff\' LIMIT 1');
    const staffId = staffResult.rows.length > 0 ? staffResult.rows[0].account_id : null;

    if (agencies.length === 0 || drivers.length === 0 || products.length === 0) {
      throw new Error('Missing required data');
    }

    // Clean up old PNHAN records
    console.log('🗑️  Cleaning up old PNHAN records...');
    await pool.query('DELETE FROM ordermgmt.distribution WHERE distribution_code LIKE \'PNHAN%\'');
    console.log('✅ Cleaned up\n');

    // Insert receive orders with PX codes
    console.log('📦 Creating receive orders with PX codes...');

    const receiveOrdersData = [
      { agencyIdx: 0, driverIdx: 0, code: 'PX000101', amount: 10500000, notes: 'Phiếu nhận chờ xác nhận - Lô 1' },
      { agencyIdx: 0, driverIdx: 0, code: 'PX000102', amount: 15750000, notes: 'Phiếu nhận chờ xác nhận - Lô 2' },
      { agencyIdx: 0, driverIdx: Math.min(1, drivers.length - 1), code: 'PX000103', amount: 8900000, notes: 'Phiếu nhận chờ xác nhận - Lô 3' },
      { agencyIdx: Math.min(1, agencies.length - 1), driverIdx: Math.min(1, drivers.length - 1), code: 'PX000104', amount: 12300000, notes: 'Phiếu nhận chờ xác nhận - Lô 1' },
      { agencyIdx: Math.min(1, agencies.length - 1), driverIdx: Math.min(2, drivers.length - 1), code: 'PX000105', amount: 9450000, notes: 'Phiếu nhận chờ xác nhận - Lô 2' },
      { agencyIdx: Math.min(2, agencies.length - 1), driverIdx: Math.min(2, drivers.length - 1), code: 'PX000106', amount: 14200000, notes: 'Phiếu nhận chờ xác nhận - Lô 1' },
      { agencyIdx: Math.min(2, agencies.length - 1), driverIdx: Math.min(3, drivers.length - 1), code: 'PX000107', amount: 11600000, notes: 'Phiếu nhận chờ xác nhận - Lô 2' },
      { agencyIdx: Math.min(2, agencies.length - 1), driverIdx: 0, code: 'PX000108', amount: 13450000, notes: 'Phiếu nhận chờ xác nhận - Lô 3' },
      { agencyIdx: Math.min(3, agencies.length - 1), driverIdx: Math.min(1, drivers.length - 1), code: 'PX000109', amount: 9800000, notes: 'Phiếu nhận chờ xác nhận - Lô 1' },
      { agencyIdx: Math.min(4, agencies.length - 1), driverIdx: Math.min(3, drivers.length - 1), code: 'PX000110', amount: 16500000, notes: 'Phiếu nhận chờ xác nhận - Lô 1' },
    ];

    const distributionIds = [];

    for (const orderData of receiveOrdersData) {
      const agency = agencies[orderData.agencyIdx];
      const driver = drivers[orderData.driverIdx];

      try {
        const result = await pool.query(
          `INSERT INTO ordermgmt.distribution 
           (distribution_code, agency_id, driver_id, order_date, delivery_date, total_amount, status, notes, created_by, created_at, updated_at)
           VALUES ($1, $2, $3, CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '1 day', $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           RETURNING distribution_id`,
          [orderData.code, agency.agency_id, driver.driver_id, orderData.amount, 'pending', orderData.notes, staffId]
        );

        const distributionId = result.rows[0].distribution_id;
        distributionIds.push({ id: distributionId, code: orderData.code });
        console.log(`  ✅ Created order ${orderData.code} for agency ${agency.code}`);
      } catch (error) {
        console.log(`  ⚠️  Skipped ${orderData.code}: ${error.message}`);
      }
    }

    console.log(`\n✅ Created ${distributionIds.length} receive orders\n`);

    // Insert order details
    console.log('📝 Creating receive order details...');

    const orderDetailsData = [
      { orderIdx: 0, productIndices: [0, 1], quantities: [100, 50], unitPrices: [85000, 40000] },
      { orderIdx: 1, productIndices: [2, 3], quantities: [75, 30], unitPrices: [150000, 150000] },
      { orderIdx: 2, productIndices: [4, Math.min(5, products.length - 1)], quantities: [60, 5], unitPrices: [148000, 4000] },
      { orderIdx: 3, productIndices: [1, Math.min(6, products.length - 1)], quantities: [80, 55], unitPrices: [40000, 165000] },
      { orderIdx: 4, productIndices: [0, Math.min(7, products.length - 1)], quantities: [70, 40], unitPrices: [85000, 85000] },
      { orderIdx: 5, productIndices: [2, 3, Math.min(8, products.length - 1)], quantities: [60, 34, 10], unitPrices: [150000, 150000, 10000] },
      { orderIdx: 6, productIndices: [4, Math.min(5, products.length - 1), Math.min(9, products.length - 1)], quantities: [50, 10, 65], unitPrices: [148000, 4000, 62000] },
      { orderIdx: 7, productIndices: [Math.min(6, products.length - 1), Math.min(7, products.length - 1), 0], quantities: [50, 50, 10], unitPrices: [165000, 85000, 85000] },
      { orderIdx: 8, productIndices: [1, 2], quantities: [95, 40], unitPrices: [40000, 150000] },
      { orderIdx: 9, productIndices: [0, 2, Math.min(6, products.length - 1)], quantities: [90, 45, 20], unitPrices: [85000, 150000, 165000] },
    ];

    for (const detailData of orderDetailsData) {
      if (detailData.orderIdx >= distributionIds.length) continue;

      const distributionId = distributionIds[detailData.orderIdx].id;
      const code = distributionIds[detailData.orderIdx].code;

      let totalInserted = 0;
      for (let i = 0; i < detailData.productIndices.length; i++) {
        const productIdx = Math.min(detailData.productIndices[i], products.length - 1);
        const productId = products[productIdx].product_id;
        const quantity = detailData.quantities[i];
        const unitPrice = detailData.unitPrices[i];
        const totalPrice = quantity * unitPrice;

        try {
          await pool.query(
            `INSERT INTO ordermgmt.distribution_detail 
             (distribution_id, product_id, quantity, unit_price, total_price, created_at)
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
            [distributionId, productId, quantity, unitPrice, totalPrice]
          );
          totalInserted++;
        } catch (error) {
          console.log(`    ⚠️  Failed to add item to ${code}`);
        }
      }

      if (totalInserted > 0) {
        console.log(`  ✅ Added ${totalInserted} items to order ${code}`);
      }
    }

    console.log(`\n✅ Created distribution details\n`);

    // Verify
    console.log('✅ Verification:');
    const verifyResult = await pool.query(`
      SELECT 
        d.distribution_code,
        a.name AS agency_name,
        d.total_amount,
        d.status,
        COUNT(dd.distribution_detail_id) AS item_count
      FROM ordermgmt.distribution d
      LEFT JOIN ordermgmt.distribution_detail dd ON d.distribution_id = dd.distribution_id
      LEFT JOIN master.agency a ON d.agency_id = a.agency_id
      WHERE d.distribution_code LIKE 'PX%' AND d.status = 'pending'
      GROUP BY d.distribution_id, a.name, d.distribution_code
      ORDER BY d.distribution_code
    `);

    if (verifyResult.rows.length > 0) {
      console.log('\n📊 Inserted Receive Orders (Pending Status):');
      console.log('─'.repeat(100));
      verifyResult.rows.forEach(row => {
        const code = (row.distribution_code || '').padEnd(12);
        const agency = (row.agency_name || 'N/A').padEnd(20);
        const amount = (row.total_amount ? row.total_amount.toLocaleString('vi-VN') : '0').padStart(15);
        const status = (row.status || '').padEnd(10);
        const items = (row.item_count || 0).toString().padStart(5);
        
        console.log(`${code} | ${agency} | ${amount}đ | ${status} | ${items} items`);
      });
      console.log('─'.repeat(100));
      console.log(`\n📈 Total: ${verifyResult.rows.length} receive orders\n`);
    }

    await pool.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

insertReceiveOrdersWithPXCode();

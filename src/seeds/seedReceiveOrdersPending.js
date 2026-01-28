// =====================================================
// SEED DATA: Insert receive orders with pending status
// Run: node backend/src/seeds/seedReceiveOrdersPending.js
// =====================================================

const pool = require('../config/database');

async function seedReceiveOrdersPending() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🌱 Starting seed receive orders with pending status...\n');

    // =====================================================
    // 1. GET ALL AGENCIES AND DRIVERS
    // =====================================================
    const agenciesResult = await client.query('SELECT agency_id, code, name FROM master.agency LIMIT 5');
    const agencies = agenciesResult.rows;
    
    const driversResult = await client.query('SELECT driver_id FROM master.driver LIMIT 4');
    const drivers = driversResult.rows;
    
    const staffResult = await client.query('SELECT account_id FROM auth.account WHERE role = \'staff\' LIMIT 2');
    const staffAccounts = staffResult.rows;

    const productsResult = await client.query('SELECT product_id FROM master.product LIMIT 10');
    const products = productsResult.rows;

    if (agencies.length === 0) {
      throw new Error('No agencies found in database');
    }
    if (drivers.length === 0) {
      throw new Error('No drivers found in database');
    }
    if (products.length === 0) {
      throw new Error('No products found in database');
    }

    console.log(`✅ Found ${agencies.length} agencies`);
    console.log(`✅ Found ${drivers.length} drivers`);
    console.log(`✅ Found ${products.length} products`);
    console.log(`✅ Found ${staffAccounts.length} staff accounts\n`);

    // =====================================================
    // 2. INSERT RECEIVE ORDERS
    // =====================================================
    console.log('📦 Creating receive orders with pending status...');

    const receiveOrdersData = [
      // Agency 1
      { agencyIdx: 0, driverIdx: 0, code: 'PNHAN001', amount: 10500000, notes: 'Phiếu nhận chờ xác nhận - Lô 1' },
      { agencyIdx: 0, driverIdx: 0, code: 'PNHAN002', amount: 15750000, notes: 'Phiếu nhận chờ xác nhận - Lô 2' },
      { agencyIdx: 0, driverIdx: 1, code: 'PNHAN003', amount: 8900000, notes: 'Phiếu nhận chờ xác nhận - Lô 3' },
      
      // Agency 2
      { agencyIdx: 1, driverIdx: 1, code: 'PNHAN004', amount: 12300000, notes: 'Phiếu nhận chờ xác nhận - Lô 1' },
      { agencyIdx: 1, driverIdx: 2, code: 'PNHAN005', amount: 9450000, notes: 'Phiếu nhận chờ xác nhận - Lô 2' },
      
      // Agency 3
      { agencyIdx: 2, driverIdx: 2, code: 'PNHAN006', amount: 14200000, notes: 'Phiếu nhận chờ xác nhận - Lô 1' },
      { agencyIdx: 2, driverIdx: 3, code: 'PNHAN007', amount: 11600000, notes: 'Phiếu nhận chờ xác nhận - Lô 2' },
      { agencyIdx: 2, driverIdx: 0, code: 'PNHAN008', amount: 13450000, notes: 'Phiếu nhận chờ xác nhận - Lô 3' },
      
      // Agency 4
      { agencyIdx: 3, driverIdx: 1, code: 'PNHAN009', amount: 9800000, notes: 'Phiếu nhận chờ xác nhận - Lô 1' },
      
      // Agency 5
      { agencyIdx: 4, driverIdx: 3, code: 'PNHAN010', amount: 16500000, notes: 'Phiếu nhận chờ xác nhận - Lô 1' },
    ];

    const distributionIds = [];

    for (const orderData of receiveOrdersData) {
      const agency = agencies[orderData.agencyIdx];
      const driver = drivers[orderData.driverIdx];
      const staffId = staffAccounts[0].account_id;

      const result = await client.query(
        `INSERT INTO ordermgmt.distribution 
         (distribution_code, agency_id, driver_id, order_date, delivery_date, total_amount, status, notes, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '1 day', $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING distribution_id`,
        [orderData.code, agency.agency_id, driver.driver_id, orderData.amount, 'pending', orderData.notes, staffId]
      );

      const distributionId = result.rows[0].distribution_id;
      distributionIds.push({ id: distributionId, code: orderData.code });
      console.log(`  ✅ Created order ${orderData.code} for agency ${agency.code}`);
    }

    console.log(`\n✅ Created ${distributionIds.length} receive orders\n`);

    // =====================================================
    // 3. INSERT ORDER DETAILS
    // =====================================================
    console.log('📝 Creating receive order details...');

    const orderDetailsData = [
      // PNHAN001
      { orderIdx: 0, productIndices: [0, 1], quantities: [100, 50], unitPrices: [85000, 40000] },
      // PNHAN002
      { orderIdx: 1, productIndices: [2, 3], quantities: [75, 30], unitPrices: [150000, 150000] },
      // PNHAN003
      { orderIdx: 2, productIndices: [4, 5], quantities: [60, 5], unitPrices: [148000, 4000] },
      // PNHAN004
      { orderIdx: 3, productIndices: [1, 6], quantities: [80, 55], unitPrices: [40000, 165000] },
      // PNHAN005
      { orderIdx: 4, productIndices: [0, 7], quantities: [70, 40], unitPrices: [85000, 85000] },
      // PNHAN006
      { orderIdx: 5, productIndices: [2, 3, 8], quantities: [60, 34, 10], unitPrices: [150000, 150000, 10000] },
      // PNHAN007
      { orderIdx: 6, productIndices: [4, 5, 9], quantities: [50, 10, 65], unitPrices: [148000, 4000, 62000] },
      // PNHAN008
      { orderIdx: 7, productIndices: [6, 7, 0], quantities: [50, 50, 10], unitPrices: [165000, 85000, 85000] },
      // PNHAN009
      { orderIdx: 8, productIndices: [1, 2], quantities: [95, 40], unitPrices: [40000, 150000] },
      // PNHAN010
      { orderIdx: 9, productIndices: [0, 2, 6], quantities: [90, 45, 20], unitPrices: [85000, 150000, 165000] },
    ];

    for (const detailData of orderDetailsData) {
      const distributionId = distributionIds[detailData.orderIdx].id;
      const code = distributionIds[detailData.orderIdx].code;

      let totalInserted = 0;
      for (let i = 0; i < detailData.productIndices.length; i++) {
        const productId = products[detailData.productIndices[i]].product_id;
        const quantity = detailData.quantities[i];
        const unitPrice = detailData.unitPrices[i];
        const totalPrice = quantity * unitPrice;

        await client.query(
          `INSERT INTO ordermgmt.distribution_detail 
           (distribution_id, product_id, quantity, unit_price, total_price, created_at)
           VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
          [distributionId, productId, quantity, unitPrice, totalPrice]
        );

        totalInserted++;
      }

      console.log(`  ✅ Added ${totalInserted} items to order ${code}`);
    }

    console.log(`\n✅ Created distribution details\n`);

    // =====================================================
    // 4. VERIFY INSERTED DATA
    // =====================================================
    console.log('✅ Verifying inserted data...\n');

    const verifyResult = await client.query(
      `SELECT 
        d.distribution_code,
        a.name AS agency_name,
        d.total_amount,
        d.status,
        COUNT(dd.distribution_detail_id) AS item_count,
        d.created_at
       FROM ordermgmt.distribution d
       LEFT JOIN ordermgmt.distribution_detail dd ON d.distribution_id = dd.distribution_id
       LEFT JOIN master.agency a ON d.agency_id = a.agency_id
       WHERE d.distribution_code LIKE 'PNHAN%' AND d.status = 'pending'
       GROUP BY d.distribution_id, a.name
       ORDER BY d.distribution_code`
    );

    console.log('📊 Inserted Receive Orders (Pending Status):');
    console.log('─'.repeat(100));
    verifyResult.rows.forEach(row => {
      console.log(`  ${row.distribution_code} | ${row.agency_name} | Amount: ${row.total_amount.toLocaleString()}đ | Items: ${row.item_count} | Status: ${row.status}`);
    });
    console.log('─'.repeat(100));
    console.log(`Total: ${verifyResult.rows.length} receive orders\n`);

    await client.query('COMMIT');
    
    console.log('\n✨ SEED RECEIVE ORDERS COMPLETED SUCCESSFULLY! ✨\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding receive orders:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the seed function
seedReceiveOrdersPending()
  .then(() => {
    console.log('✅ Seed process finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed process failed:', error);
    process.exit(1);
  });

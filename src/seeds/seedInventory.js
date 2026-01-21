const pool = require('../config/database');

async function seedInventoryData() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Clear existing data
    const batchTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'master' 
        AND table_name = 'inventory_batch'
      );
    `);
    
    if (batchTableExists.rows[0].exists) {
      await client.query('DELETE FROM master.inventory_batch');
    }
    
    await client.query('DELETE FROM master.inventory_product');
    await client.query('DELETE FROM master.product');
    await client.query('DELETE FROM master.warehouse');
    await client.query('DELETE FROM master.supplier');
    console.log('✅ Cleared existing data');

    // Create suppliers
    await client.query(`
      INSERT INTO master.supplier (code, name, contact_person, phone, email, address, status)
      VALUES
        ('NCC001', 'Công ty TNHH Thực phẩm Việt Nam', 'Nguyễn Văn A', '0281234567', 'contact@tpvn.com', 'TP.HCM', 'active'),
        ('NCC002', 'Tập đoàn Unilever Việt Nam', 'Trần Thị B', '0281234568', 'info@unilever.vn', 'TP.HCM', 'active'),
        ('NCC003', 'Công ty CP Vinamilk', 'Lê Văn C', '0281234569', 'support@vinamilk.com.vn', 'TP.HCM', 'active'),
        ('NCC004', 'Công ty TNHH Nestlé Việt Nam', 'Phạm Thị D', '0281234570', 'info@nestle.vn', 'TP.HCM', 'active')
    `);
    console.log('✅ Suppliers created');

    // Get supplier IDs
    const suppliers = await client.query('SELECT supplier_id FROM master.supplier ORDER BY supplier_id');
    const [sup1, sup2, sup3, sup4] = suppliers.rows.map(s => s.supplier_id);

    // Create 3 warehouse zones: Thường, Mát, Đông lạnh
    await client.query(`
      INSERT INTO master.warehouse (code, name, location, capacity, status)
      VALUES
        ('KHO_THUONG', 'Kho thường', 'Khu A - Tầng 1', 50000000, 'active'),
        ('KHO_MAT', 'Kho mát', 'Khu B - Tầng 1', 30000000, 'active'),
        ('KHO_DONG_LANH', 'Kho đông lạnh', 'Khu C - Tầng 1', 20000000, 'active')
    `);
    console.log('✅ Warehouses created (3 zones)');

    // Create diverse products (20+ products)
    await client.query(`
      INSERT INTO master.product (code, name, supplier_id, category, unit, cost_price, selling_price, price, status)
      VALUES
        -- Sản phẩm KHO THƯỜNG (không cần bảo quản lạnh)
        ('SP001', 'Bia Hà Nội', $1, 'Đồ uống', 'Thùng', 280000, 350000, 350000, 'active'),
        ('SP002', 'Nước ngọt Pepsi', $1, 'Đồ uống', 'Thùng', 220000, 280000, 280000, 'active'),
        ('SP003', 'Nước khoáng LaVie', $1, 'Đồ uống', 'Thùng', 65000, 85000, 85000, 'active'),
        ('SP004', 'Bánh quy Oreo', $2, 'Bánh kẹo', 'Hộp', 28000, 35000, 35000, 'active'),
        ('SP005', 'Dầu ăn Neptune', $1, 'Thực phẩm', 'Chai', 52000, 65000, 65000, 'active'),
        ('SP006', 'Mì gói Hảo Hảo', $1, 'Thực phẩm', 'Thùng', 95000, 120000, 120000, 'active'),
        ('SP007', 'Nước mắm Nam Ngư', $1, 'Gia vị', 'Chai', 20000, 25000, 25000, 'active'),
        ('SP008', 'Đường Biên Hòa', $1, 'Thực phẩm', 'Bao', 14000, 18000, 18000, 'active'),
        ('SP009', 'Café Trung Nguyên', $1, 'Đồ uống', 'Gói', 68000, 85000, 85000, 'active'),
        ('SP010', 'Bánh snack Oishi', $2, 'Bánh kẹo', 'Gói', 12000, 15000, 15000, 'active'),
        ('SP011', 'Nước tương Chinsu', $1, 'Gia vị', 'Chai', 17000, 22000, 22000, 'active'),
        ('SP012', 'Gạo ST25', $1, 'Thực phẩm', 'Bao', 140000, 180000, 180000, 'active'),
        
        -- Sản phẩm KHO MÁT (bảo quản 2-8°C)
        ('SP013', 'Sữa tươi Vinamilk', $3, 'Sữa', 'Lốc', 35000, 45000, 45000, 'active'),
        ('SP014', 'Yaourt TH True Milk', $3, 'Sữa', 'Hộp', 30000, 38000, 38000, 'active'),
        ('SP015', 'Phô mai Con Bò Cười', $4, 'Sữa', 'Hộp', 43000, 55000, 55000, 'active'),
        ('SP016', 'Thịt heo tươi', $1, 'Thực phẩm', 'Kg', 75000, 95000, 95000, 'active'),
        ('SP017', 'Thịt bò tươi', $1, 'Thực phẩm', 'Kg', 200000, 250000, 250000, 'active'),
        ('SP018', 'Rau xanh tươi', $1, 'Thực phẩm', 'Kg', 18000, 25000, 25000, 'active'),
        ('SP019', 'Trái cây tươi', $1, 'Thực phẩm', 'Kg', 35000, 45000, 45000, 'active'),
        
        -- Sản phẩm KHO ĐÔNG LẠNH (-18°C trở xuống)
        ('SP020', 'Kem Walls Magnum', $2, 'Đồ uống', 'Hộp', 52000, 65000, 65000, 'active'),
        ('SP021', 'Cá tra phi lê đông lạnh', $1, 'Thực phẩm', 'Kg', 68000, 85000, 85000, 'active'),
        ('SP022', 'Tôm đông lạnh', $1, 'Thực phẩm', 'Kg', 145000, 180000, 180000, 'active'),
        ('SP023', 'Thịt gà đông lạnh', $1, 'Thực phẩm', 'Kg', 60000, 75000, 75000, 'active'),
        ('SP024', 'Pizza đông lạnh', $4, 'Thực phẩm', 'Hộp', 75000, 95000, 95000, 'active')
    `, [sup1, sup2, sup3, sup4]);
    console.log('✅ Products seeded (24 products)');

    // Get warehouse and product IDs
    const warehouses = await client.query(`
      SELECT warehouse_id, name 
      FROM master.warehouse 
      ORDER BY 
        CASE name
          WHEN 'Kho thường' THEN 1
          WHEN 'Kho mát' THEN 2
          WHEN 'Kho đông lạnh' THEN 3
        END
    `);
    const products = await client.query('SELECT product_id, code, name FROM master.product ORDER BY product_id');

    const [khoThuong, khoMat, khoDongLanh] = warehouses.rows;

    // Helper function to calculate expiry date
    const getExpiryDate = (daysFromNow) => {
      const date = new Date();
      date.setDate(date.getDate() + daysFromNow);
      return date.toISOString().split('T')[0];
    };

    // Diverse inventory data with multiple batches per product
    const inventoryData = [
      // KHO THƯỜNG - Sản phẩm không cần bảo quản lạnh (mỗi sản phẩm có 2 lô)
      { productCode: 'SP001', warehouse: khoThuong, batches: [
        { quantity: 100, expiryDate: getExpiryDate(180) },
        { quantity: 50, expiryDate: getExpiryDate(120) }
      ]},
      { productCode: 'SP002', warehouse: khoThuong, batches: [
        { quantity: 15, expiryDate: getExpiryDate(10) },
        { quantity: 10, expiryDate: getExpiryDate(25) }
      ]},
      { productCode: 'SP003', warehouse: khoThuong, batches: [] },  // Hết hàng
      { productCode: 'SP004', warehouse: khoThuong, batches: [
        { quantity: 120, expiryDate: getExpiryDate(365) },
        { quantity: 80, expiryDate: getExpiryDate(300) }
      ]},
      { productCode: 'SP005', warehouse: khoThuong, batches: [
        { quantity: 300, expiryDate: getExpiryDate(730) },
        { quantity: 200, expiryDate: getExpiryDate(600) }
      ]},
      { productCode: 'SP006', warehouse: khoThuong, batches: [
        { quantity: 10, expiryDate: getExpiryDate(20) },
        { quantity: 5, expiryDate: getExpiryDate(35) }
      ]},
      { productCode: 'SP007', warehouse: khoThuong, batches: [
        { quantity: 25, expiryDate: getExpiryDate(270) },
        { quantity: 20, expiryDate: getExpiryDate(240) }
      ]},
      { productCode: 'SP008', warehouse: khoThuong, batches: [
        { quantity: 70, expiryDate: getExpiryDate(400) },
        { quantity: 50, expiryDate: getExpiryDate(350) }
      ]},
      { productCode: 'SP009', warehouse: khoThuong, batches: [
        { quantity: 5, expiryDate: getExpiryDate(20) },
        { quantity: 3, expiryDate: getExpiryDate(15) }
      ]},
      { productCode: 'SP010', warehouse: khoThuong, batches: [
        { quantity: 200, expiryDate: getExpiryDate(200) },
        { quantity: 150, expiryDate: getExpiryDate(180) }
      ]},
      { productCode: 'SP011', warehouse: khoThuong, batches: [
        { quantity: 50, expiryDate: getExpiryDate(300) },
        { quantity: 40, expiryDate: getExpiryDate(250) }
      ]},
      { productCode: 'SP012', warehouse: khoThuong, batches: [
        { quantity: 10, expiryDate: getExpiryDate(90) },
        { quantity: 5, expiryDate: getExpiryDate(60) }
      ]},
      
      // KHO MÁT - Sản phẩm cần bảo quản 2-8°C (HSD ngắn hơn, 2 lô mỗi sản phẩm)
      { productCode: 'SP013', warehouse: khoMat, batches: [] },  // Hết hàng
      { productCode: 'SP014', warehouse: khoMat, batches: [
        { quantity: 40, expiryDate: getExpiryDate(15) },
        { quantity: 25, expiryDate: getExpiryDate(20) }
      ]},
      { productCode: 'SP015', warehouse: khoMat, batches: [
        { quantity: 25, expiryDate: getExpiryDate(45) },
        { quantity: 15, expiryDate: getExpiryDate(50) }
      ]},
      { productCode: 'SP016', warehouse: khoMat, batches: [
        { quantity: 12, expiryDate: getExpiryDate(3) },
        { quantity: 10, expiryDate: getExpiryDate(8) }
      ]},
      { productCode: 'SP017', warehouse: khoMat, batches: [
        { quantity: 7, expiryDate: getExpiryDate(7) },
        { quantity: 5, expiryDate: getExpiryDate(12) }
      ]},
      { productCode: 'SP018', warehouse: khoMat, batches: [
        { quantity: 50, expiryDate: getExpiryDate(5) },
        { quantity: 35, expiryDate: getExpiryDate(10) }
      ]},
      { productCode: 'SP019', warehouse: khoMat, batches: [
        { quantity: 30, expiryDate: getExpiryDate(10) },
        { quantity: 25, expiryDate: getExpiryDate(15) }
      ]},
      
      // KHO ĐÔNG LẠNH - Sản phẩm cần -18°C trở xuống (HSD dài hơn, 2 lô mỗi sản phẩm)
      { productCode: 'SP020', warehouse: khoDongLanh, batches: [
        { quantity: 100, expiryDate: getExpiryDate(365) },
        { quantity: 80, expiryDate: getExpiryDate(400) }
      ]},
      { productCode: 'SP021', warehouse: khoDongLanh, batches: [
        { quantity: 3, expiryDate: getExpiryDate(30) },
        { quantity: 2, expiryDate: getExpiryDate(45) }
      ]},
      { productCode: 'SP022', warehouse: khoDongLanh, batches: [
        { quantity: 18, expiryDate: getExpiryDate(180) },
        { quantity: 12, expiryDate: getExpiryDate(200) }
      ]},
      { productCode: 'SP023', warehouse: khoDongLanh, batches: [
        { quantity: 55, expiryDate: getExpiryDate(270) },
        { quantity: 40, expiryDate: getExpiryDate(300) }
      ]},
      { productCode: 'SP024', warehouse: khoDongLanh, batches: [] },  // Hết hàng
    ];

    // Create batch tracking table if not exists
    const batchTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'master' 
        AND table_name = 'inventory_batch'
      );
    `);

    if (!batchTableCheck.rows[0].exists) {
      await client.query(`
        CREATE TABLE master.inventory_batch (
          batch_id SERIAL PRIMARY KEY,
          inventory_product_id INTEGER REFERENCES master.inventory_product(inventory_product_id) ON DELETE CASCADE,
          batch_code VARCHAR(50) UNIQUE NOT NULL,
          quantity INTEGER NOT NULL,
          expiry_date DATE,
          import_date DATE DEFAULT CURRENT_DATE,
          status VARCHAR(20) DEFAULT 'normal' CHECK (status IN ('normal', 'near_expiry', 'expired')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ Table master.inventory_batch created');
    }

    // Insert inventory data with multiple batches per product
    let batchCounter = 1;
    for (const item of inventoryData) {
      const product = products.rows.find(p => p.code === item.productCode);
      
      if (product && item.warehouse) {
        // Calculate total quantity from all batches
        const totalQuantity = item.batches.reduce((sum, batch) => sum + batch.quantity, 0);
        
        // Insert into inventory_product
        const inventoryResult = await client.query(`
          INSERT INTO master.inventory_product (warehouse_id, product_id, quantity, last_updated)
          VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
          RETURNING inventory_product_id
        `, [item.warehouse.warehouse_id, product.product_id, totalQuantity]);

        // Insert batch info for each batch
        const inventoryProductId = inventoryResult.rows[0].inventory_product_id;
        
        for (const batch of item.batches) {
          const batchCode = `LO${item.productCode.replace('SP', '')}-${String(batchCounter).padStart(2, '0')}`;
          batchCounter++;
          
          // Calculate manufacture date (30-90 days before expiry for most products)
          const expiryDate = new Date(batch.expiryDate);
          const daysBeforeExpiry = item.warehouse.name === 'Kho mát' ? 30 : 90;
          const manufactureDate = new Date(expiryDate);
          manufactureDate.setDate(manufactureDate.getDate() - daysBeforeExpiry);
          
          // Calculate status based on expiry date
          const daysUntilExpiry = Math.floor((new Date(batch.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
          
          let status = 'normal';
          if (daysUntilExpiry < 0) status = 'expired';
          else if (daysUntilExpiry <= 30) status = 'near_expiry';

          await client.query(`
            INSERT INTO master.inventory_batch 
            (inventory_product_id, batch_code, quantity, expiry_date, import_date, status)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [inventoryProductId, batchCode, batch.quantity, batch.expiryDate, manufactureDate.toISOString().split('T')[0], status]);
        }
      }
    }

    console.log('✅ Inventory data seeded successfully!');
    console.log(`   - Warehouses: 3 zones (Thường/Mát/Đông lạnh)`);
    console.log(`   - Products: ${products.rows.length}`);
    console.log(`   - Inventory items: ${inventoryData.length}`);
    console.log(`   - Stock levels: Varied (0 to 500 units)`);

    await client.query('COMMIT');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding inventory:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run if called directly
if (require.main === module) {
  seedInventoryData()
    .then(() => {
      console.log('✅ Inventory seed completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Inventory seed failed:', error);
      process.exit(1);
    });
}

module.exports = seedInventoryData;

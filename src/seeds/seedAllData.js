// =====================================================
// SEED DATA: Tạo dữ liệu mẫu cho toàn bộ hệ thống
// Run: node backend/src/seeds/seedAllData.js
// =====================================================

const pool = require('../config/database');
const bcrypt = require('bcryptjs');

async function seedAllData() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🌱 Starting seed data process...\n');

    // =====================================================
    // 1. DISTRICTS (Quận/Huyện)
    // =====================================================
    console.log('📍 Seeding districts...');
    const districts = [
      'Quận 1', 'Quận 2', 'Quận 3', 'Quận 4', 'Quận 5', 
      'Quận 6', 'Quận 7', 'Quận 8', 'Quận 9', 'Quận 10',
      'Quận 11', 'Quận 12', 'Thủ Đức', 'Bình Thạnh', 'Gò Vấp',
      'Phú Nhuận', 'Tân Bình', 'Tân Phú', 'Bình Tân'
    ];
    
    for (const district of districts) {
      await client.query(
        'INSERT INTO master.district (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
        [district]
      );
    }
    console.log('✅ Districts seeded\n');

    // =====================================================
    // 2. PRODUCT CATEGORIES
    // =====================================================
    console.log('📦 Seeding product categories...');
    const categories = [
      ['Nước giải khát', 'Nước ngọt, nước ép, nước khoáng'],
      ['Đồ uống có cồn', 'Bia, rượu các loại'],
      ['Snack', 'Bánh snack, kẹo, socola'],
      ['Thực phẩm đóng hộp', 'Thực phẩm chế biến sẵn'],
      ['Sữa và sản phẩm từ sữa', 'Sữa tươi, sữa chua, phô mai']
    ];

    for (const [name, description] of categories) {
      await client.query(
        'INSERT INTO master.product_category (name, description) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
        [name, description]
      );
    }
    console.log('✅ Categories seeded\n');

    // =====================================================
    // 3. SUPPLIERS (Nhà cung cấp)
    // =====================================================
    console.log('🏭 Seeding suppliers...');
    const suppliers = [
      ['SUP001', 'Công ty TNHH Coca-Cola Việt Nam', '123 Nguyễn Huệ, Quận 1, TP.HCM', '0281234567', 'cocacola@vn.com'],
      ['SUP002', 'Công ty CP Bia Sài Gòn', '456 Lê Lợi, Quận 1, TP.HCM', '0281234568', 'sabeco@vn.com'],
      ['SUP003', 'Công ty TNHH PepsiCo Việt Nam', '789 Trần Hưng Đạo, Quận 5, TP.HCM', '0281234569', 'pepsico@vn.com'],
      ['SUP004', 'Công ty CP Vinamilk', '321 Điện Biên Phủ, Bình Thạnh, TP.HCM', '0281234570', 'vinamilk@vn.com'],
      ['SUP005', 'Công ty TNHH Nestlé Việt Nam', '654 Cách Mạng Tháng 8, Tân Bình, TP.HCM', '0281234571', 'nestle@vn.com']
    ];

    for (const [code, name, address, phone, email] of suppliers) {
      await client.query(
        `INSERT INTO master.supplier (code, name, address, phone, email, status) 
         VALUES ($1, $2, $3, $4, $5, 'active') 
         ON CONFLICT (code) DO NOTHING`,
        [code, name, address, phone, email]
      );
    }
    console.log('✅ Suppliers seeded\n');

    // =====================================================
    // 4. STAFF (Nhân viên)
    // =====================================================
    console.log('👥 Seeding staff...');
    const staffData = [
      ['Trần Văn An', '0901234567', 'tranan@company.com', '123 Lý Thường Kiệt, Quận 10', '1990-05-15'],
      ['Nguyễn Trọng Tèo', '0901234568', 'nguyenteo@company.com', '456 Nguyễn Thị Minh Khai, Quận 3', '1988-08-20'],
      ['Nguyễn Trọng Đại', '0901234569', 'nguyendai@company.com', '789 Võ Văn Tần, Quận 3', '1992-03-10']
    ];

    for (const [full_name, phone, email, address, dob] of staffData) {
      await client.query(
        `INSERT INTO master.staff (full_name, phone, email, address, date_of_birth, hire_date, status) 
         VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, 'active')`,
        [full_name, phone, email, address, dob]
      );
    }
    console.log('✅ Staff seeded\n');

    // =====================================================
    // 5. ACCOUNTS (Tài khoản)
    // =====================================================
    console.log('🔐 Seeding accounts...');
    const hashedPassword = await bcrypt.hash('123456', 10);
    
    const accounts = [
      ['admin', 'admin', hashedPassword],
      ['staff01', 'staff', hashedPassword],
      ['staff02', 'staff', hashedPassword],
      ['agency01', 'agency', hashedPassword],
      ['agency02', 'agency', hashedPassword],
      ['agency03', 'agency', hashedPassword],
      ['agency04', 'agency', hashedPassword],
      ['agency05', 'agency', hashedPassword]
    ];

    for (const [username, role, password] of accounts) {
      await client.query(
        `INSERT INTO auth.account (username, password_hash, role, is_active) 
         VALUES ($1, $2, $3, true) 
         ON CONFLICT (username) DO NOTHING`,
        [username, password, role]
      );
    }
    console.log('✅ Accounts seeded\n');

    // =====================================================
    // 6. USERS (Liên kết account với staff/agency)
    // =====================================================
    console.log('👤 Seeding users...');
    
    // Admin user
    await client.query(
      `INSERT INTO auth."user" (account_id, full_name, email, phone, staff_id, agency_id)
       SELECT account_id, 'Administrator', 'admin@company.com', '0281234567', NULL, NULL
       FROM auth.account WHERE username = 'admin'
       ON CONFLICT DO NOTHING`
    );

    // Staff users
    await client.query(
      `INSERT INTO auth."user" (account_id, full_name, email, phone, staff_id, agency_id)
       SELECT a.account_id, s.full_name, s.email, s.phone, s.staff_id, NULL
       FROM auth.account a
       CROSS JOIN master.staff s
       WHERE a.username = 'staff01' AND s.staff_id = 2
       ON CONFLICT DO NOTHING`
    );

    await client.query(
      `INSERT INTO auth."user" (account_id, full_name, email, phone, staff_id, agency_id)
       SELECT a.account_id, s.full_name, s.email, s.phone, s.staff_id, NULL
       FROM auth.account a
       CROSS JOIN master.staff s
       WHERE a.username = 'staff02' AND s.staff_id = 3
       ON CONFLICT DO NOTHING`
    );

    console.log('✅ Users seeded\n');

    // =====================================================
    // 7. AGENCIES (Đại lý)
    // =====================================================
    console.log('🏢 Seeding agencies...');
    const agencies = [
      ['DL001', 'Đại lý Miền Đông', '123 Xa lộ Hà Nội, Quận 9', 'Quận 9', '0902345678', 'miendong@agency.com', 'gold', 2],
      ['DL002', 'Đại lý Miền Tây', '456 Kinh Dương Vương, Quận 6', 'Quận 6', '0902345679', 'mientay@agency.com', 'silver', 2],
      ['DL003', 'Đại lý Miền Nam', '789 Nguyễn Văn Linh, Quận 7', 'Quận 7', '0902345680', 'miennam@agency.com', 'bronze', 2],
      ['DL004', 'Đại lý Miền Bắc', '321 Hoàng Văn Thụ, Tân Bình', 'Tân Bình', '0902345681', 'mienbac@agency.com', 'gold', null],
      ['DL005', 'Đại lý Trung Tâm', '654 Lê Văn Sỹ, Quận 3', 'Quận 3', '0902345682', 'trungtam@agency.com', 'platinum', null]
    ];

    let agencyIdCounter = 15; // Start from 15 to match existing data
    for (const [code, name, address, district, phone, email, level, managed_by] of agencies) {
      await client.query(
        `INSERT INTO master.agency (code, name, address, district, phone, email, level, 
         sales_volume, max_debt, current_debt, debt_limit, managed_by_staff_id, status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 50000000, 0, 50000000, $8, 'active')
         ON CONFLICT (code) DO NOTHING`,
        [code, name, address, district, phone, email, level, managed_by]
      );
    }

    // Update agency users
    for (let i = 0; i < 5; i++) {
      const agencyCode = agencies[i][0];
      const agencyName = agencies[i][1];
      const accountUsername = `agency0${i + 1}`;
      
      await client.query(
        `INSERT INTO auth."user" (account_id, full_name, email, phone, staff_id, agency_id)
         SELECT a.account_id, ag.name, ag.email, ag.phone, NULL, ag.agency_id
         FROM auth.account a
         CROSS JOIN master.agency ag
         WHERE a.username = $1 AND ag.code = $2
         ON CONFLICT DO NOTHING`,
        [accountUsername, agencyCode]
      );
    }

    console.log('✅ Agencies seeded\n');

    // =====================================================
    // 8. PRODUCTS (Sản phẩm)
    // =====================================================
    console.log('🍾 Seeding products...');
    const products = [
      ['SP001', 'Coca-Cola lon 330ml', 1, 1, 'Lon', 180000, 220000],
      ['SP002', 'Pepsi lon 330ml', 1, 3, 'Lon', 175000, 215000],
      ['SP003', 'Bia Sài Gòn đỏ chai 330ml', 2, 2, 'Chai', 220000, 280000],
      ['SP004', 'Bia Tiger chai 330ml', 2, 2, 'Chai', 250000, 320000],
      ['SP005', 'Sữa Vinamilk có đường hộp 180ml', 5, 4, 'Hộp', 95000, 125000],
      ['SP006', 'Nước khoáng Lavie 500ml', 1, 1, 'Chai', 70000, 95000],
      ['SP007', 'Snack Oishi Tôm 40g', 3, 5, 'Gói', 85000, 115000],
      ['SP008', 'Bánh quy Cosy Marie 168g', 3, 5, 'Gói', 120000, 155000],
      ['SP009', 'Nước cam Twister 400ml', 1, 3, 'Chai', 140000, 180000],
      ['SP010', 'Sữa chua uống TH True Yogurt 180ml', 5, 4, 'Chai', 105000, 140000]
    ];

    for (const [code, name, category_id, supplier_id, unit, cost, selling] of products) {
      await client.query(
        `INSERT INTO master.product (code, name, category_id, supplier_id, unit, cost_price, selling_price, status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
         ON CONFLICT (code) DO NOTHING`,
        [code, name, category_id, supplier_id, unit, cost, selling]
      );
    }
    console.log('✅ Products seeded\n');

    // =====================================================
    // 9. INVENTORY (Kho hàng)
    // =====================================================
    console.log('📊 Seeding inventory...');
    
    // Get product IDs
    const productsResult = await client.query('SELECT product_id FROM master.product ORDER BY product_id');
    const productIds = productsResult.rows.map(r => r.product_id);

    // Create inventory products
    for (const productId of productIds) {
      await client.query(
        `INSERT INTO master.inventory_product (product_id, total_quantity, available_quantity, reserved_quantity)
         VALUES ($1, 0, 0, 0)
         ON CONFLICT DO NOTHING`,
        [productId]
      );
    }

    // Create batches with data
    const batches = [
      [1, 100, '2024-01-15', '2025-12-31'],
      [2, 150, '2024-02-10', '2025-11-30'],
      [3, 200, '2024-01-20', '2025-10-15'],
      [4, 80, '2024-03-05', '2025-09-20'],
      [5, 120, '2024-02-25', '2025-08-10'],
      [6, 300, '2024-01-10', '2025-12-31'],
      [7, 250, '2024-02-15', '2025-06-30'],
      [8, 180, '2024-03-01', '2025-07-15'],
      [9, 90, '2024-02-20', '2025-05-20'],
      [10, 110, '2024-03-10', '2025-04-30']
    ];

    for (let i = 0; i < batches.length; i++) {
      const [productIdx, qty, mfgDate, expDate] = batches[i];
      const productId = productIds[productIdx - 1];
      const batchCode = `BATCH${String(i + 1).padStart(4, '0')}`;
      
      await client.query(
        `INSERT INTO master.inventory_batch (batch_code, product_id, quantity, remaining_quantity, manufacturing_date, expiry_date, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'normal')
         ON CONFLICT (batch_code) DO NOTHING`,
        [batchCode, productId, qty, qty, mfgDate, expDate]
      );

      // Update inventory product
      await client.query(
        `UPDATE master.inventory_product 
         SET total_quantity = total_quantity + $1,
             available_quantity = available_quantity + $2
         WHERE product_id = $3`,
        [qty, qty, productId]
      );
    }

    console.log('✅ Inventory seeded\n');

    // =====================================================
    // 10. DRIVERS (Tài xế)
    // =====================================================
    console.log('🚛 Seeding drivers...');
    const drivers = [
      ['Nguyễn Văn A', '0903456789', '79A12345', '51A-12345'],
      ['Trần Văn B', '0903456790', '79B12346', '51B-12346'],
      ['Lê Văn C', '0903456791', '79C12347', '51C-12347'],
      ['Phạm Văn D', '0903456792', '79D12348', '51D-12348']
    ];

    for (const [name, phone, license, vehicle] of drivers) {
      await client.query(
        `INSERT INTO master.driver (full_name, phone, license_number, vehicle_number, status)
         VALUES ($1, $2, $3, $4, 'available')`,
        [name, phone, license, vehicle]
      );
    }
    console.log('✅ Drivers seeded\n');

    // =====================================================
    // 11. REGULATIONS (Quy định)
    // =====================================================
    console.log('📋 Seeding regulations...');
    const regulations = [
      ['REG001', 'Số lượng loại sản phẩm tối thiểu', 'Số lượng loại sản phẩm tối thiểu khi nhập hàng', 5],
      ['REG002', 'Số lượng loại sản phẩm tối đa', 'Số lượng loại sản phẩm tối đa trong một lần nhập', 50],
      ['REG003', 'Giá trị nợ tối đa', 'Giá trị nợ tối đa của đại lý (VNĐ)', 50000000],
      ['REG004', 'Số lượng tối thiểu mỗi sản phẩm', 'Số lượng tối thiểu của mỗi sản phẩm khi nhập hàng', 10],
      ['REG005', 'Thời gian cảnh báo hết hạn', 'Số ngày cảnh báo trước khi sản phẩm hết hạn', 30],
      ['REG006', 'Phần trăm giảm giá tối đa', 'Phần trăm giảm giá tối đa cho phép (%)', 30],
      ['REG007', 'Số ngày công nợ tối đa', 'Số ngày công nợ tối đa cho phép', 30],
      ['REG008', 'Giá trị đơn hàng tối thiểu', 'Giá trị đơn hàng tối thiểu (VNĐ)', 500000],
      ['REG009', 'Số lượng đại lý tối đa mỗi nhân viên', 'Số lượng đại lý tối đa mà một nhân viên có thể quản lý', 10],
      ['REG010', 'Tỷ lệ hoa hồng (%)', 'Tỷ lệ hoa hồng cho nhân viên bán hàng (%)', 5]
    ];

    for (const [code, name, description, value] of regulations) {
      await client.query(
        `INSERT INTO config.regulation (code, name, description, value, status)
         VALUES ($1, $2, $3, $4, 'active')
         ON CONFLICT (code) DO NOTHING`,
        [code, name, description, value]
      );
    }
    console.log('✅ Regulations seeded\n');

    await client.query('COMMIT');
    
    console.log('\n✨ SEED DATA COMPLETED SUCCESSFULLY! ✨\n');
    console.log('📊 Summary:');
    console.log('  - Districts: 19');
    console.log('  - Categories: 5');
    console.log('  - Suppliers: 5');
    console.log('  - Staff: 3');
    console.log('  - Accounts: 8');
    console.log('  - Agencies: 5');
    console.log('  - Products: 10');
    console.log('  - Inventory Batches: 10');
    console.log('  - Drivers: 4');
    console.log('  - Regulations: 10\n');
    console.log('🔐 Default password for all accounts: 123456\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the seed function
seedAllData()
  .then(() => {
    console.log('✅ Seed process finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed process failed:', error);
    process.exit(1);
  });

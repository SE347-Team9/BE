const pool = require('../config/database');

async function seedWarehouse() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Check if warehouse table exists in master schema
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'master' 
        AND table_name = 'warehouse'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('⚠️  Table master.warehouse does not exist. Creating...');
      
      // Create warehouse table
      await client.query(`
        CREATE TABLE master.warehouse (
          warehouse_id SERIAL PRIMARY KEY,
          code VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(100) NOT NULL,
          location VARCHAR(200),
          capacity INTEGER DEFAULT 0,
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      console.log('✅ Table master.warehouse created');
    }

    // Check if data already exists
    const countResult = await client.query('SELECT COUNT(*) FROM master.warehouse');
    if (parseInt(countResult.rows[0].count) > 0) {
      console.log('⚠️  Warehouse data already exists. Skipping seed.');
      await client.query('ROLLBACK');
      return;
    }

    // Insert warehouse data
    await client.query(`
      INSERT INTO master.warehouse (code, name, location, capacity, status)
      VALUES
        ('KHO001', 'Kho Trung Tâm TP.HCM', 'Quận 1, TP.HCM', 100000000, 'active'),
        ('KHO002', 'Kho Miền Bắc', 'Hoàn Kiếm, Hà Nội', 80000000, 'active'),
        ('KHO003', 'Kho Miền Trung', 'Hải Châu, Đà Nẵng', 60000000, 'active'),
        ('KHO004', 'Kho Bình Dương', 'Thủ Dầu Một, Bình Dương', 50000000, 'active'),
        ('KHO005', 'Kho Đồng Nai', 'Biên Hòa, Đồng Nai', 40000000, 'inactive')
    `);

    // Create inventory_product junction table if not exists
    const inventoryCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'master' 
        AND table_name = 'inventory_product'
      );
    `);

    if (!inventoryCheck.rows[0].exists) {
      await client.query(`
        CREATE TABLE master.inventory_product (
          inventory_product_id SERIAL PRIMARY KEY,
          warehouse_id INTEGER REFERENCES master.warehouse(warehouse_id) ON DELETE CASCADE,
          product_id INTEGER REFERENCES master.product(product_id) ON DELETE CASCADE,
          quantity BIGINT DEFAULT 0,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(warehouse_id, product_id)
        );
      `);
      
      console.log('✅ Table master.inventory_product created');
    }

    // Insert sample inventory data (linking warehouses with products)
    // Assuming products already exist from seedProducts.js
    const productsResult = await client.query('SELECT product_id FROM master.product LIMIT 10');
    const warehousesResult = await client.query('SELECT warehouse_id FROM master.warehouse WHERE status = $1', ['active']);

    if (productsResult.rows.length > 0 && warehousesResult.rows.length > 0) {
      for (const warehouse of warehousesResult.rows) {
        for (let i = 0; i < Math.min(5, productsResult.rows.length); i++) {
          const product = productsResult.rows[i];
          const quantity = Math.floor(Math.random() * 5000) + 1000; // Random quantity between 1000-6000
          
          await client.query(`
            INSERT INTO master.inventory_product (warehouse_id, product_id, quantity)
            VALUES ($1, $2, $3)
            ON CONFLICT (warehouse_id, product_id) DO NOTHING
          `, [warehouse.warehouse_id, product.product_id, quantity]);
        }
      }
      
      console.log('✅ Sample inventory products seeded');
    }

    await client.query('COMMIT');
    console.log('✅ Warehouse data seeded successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding warehouse:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run if called directly
if (require.main === module) {
  seedWarehouse()
    .then(() => {
      console.log('✅ Warehouse seed completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Warehouse seed failed:', error);
      process.exit(1);
    });
}

module.exports = seedWarehouse;

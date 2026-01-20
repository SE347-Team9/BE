const pool = require('../config/database');

async function checkWarehouseSchema() {
  try {
    // Check warehouse schema
    const warehouseResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'master' 
      AND table_name = 'warehouse' 
      ORDER BY ordinal_position
    `);
    
    console.log('=== Warehouse schema ===');
    console.log(JSON.stringify(warehouseResult.rows, null, 2));
    
    // Check product schema
    const productResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'master' 
      AND table_name = 'product' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n=== Product schema ===');
    console.log(JSON.stringify(productResult.rows, null, 2));
    
    // Check inventory_product schema
    const inventoryResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'master' 
      AND table_name = 'inventory_product' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n=== Inventory_product schema ===');
    console.log(JSON.stringify(inventoryResult.rows, null, 2));
    
    // Check existing products
    const existingProducts = await pool.query(`
      SELECT product_id, code, name, unit 
      FROM master.product 
      LIMIT 5
    `);
    
    console.log('\n=== Existing products ===');
    console.log(JSON.stringify(existingProducts.rows, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkWarehouseSchema();

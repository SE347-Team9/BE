const pool = require('../config/database');

// GET inventory overview with warehouse zones and batch info
async function getInventoryOverview(req, res) {
  try {
    // Step 1: Get unique products with their total inventory
    const productsQuery = `
      SELECT DISTINCT
        p.product_id,
        p.code,
        p.name,
        p.category,
        p.unit,
        p.selling_price,
        COALESCE(SUM(ip.quantity), 0) AS total_quantity,
        50 AS min_stock
      FROM master.product p
      LEFT JOIN master.inventory_product ip ON ip.product_id = p.product_id
      GROUP BY p.product_id, p.code, p.name, p.category, p.unit, p.selling_price
      ORDER BY p.product_id
    `;
    
    const productsResult = await pool.query(productsQuery);
    const products = productsResult.rows;

    // Step 2: For each product, get warehouse info and ALL batches
    const productsWithBatches = [];
    for (const product of products) {
      let batches = [];
      let warehouseName = 'Kho thường';
      let warehouseId = null;
      
      // Get first inventory_product entry for warehouse info
      const inventoryQuery = `
        SELECT inventory_product_id, warehouse_id
        FROM master.inventory_product
        WHERE product_id = $1
        LIMIT 1
      `;
      
      const inventoryResult = await pool.query(inventoryQuery, [product.product_id]);
      
      if (inventoryResult.rows.length > 0) {
        const invProduct = inventoryResult.rows[0];
        warehouseId = invProduct.warehouse_id;
        
        // Get warehouse name
        if (warehouseId) {
          const warehouseQuery = `SELECT name FROM master.warehouse WHERE warehouse_id = $1`;
          const warehouseResult = await pool.query(warehouseQuery, [warehouseId]);
          if (warehouseResult.rows.length > 0) {
            warehouseName = warehouseResult.rows[0].name;
          }
        }
        
        // Get ALL batches for this product (across all its inventory_product entries)
        const batchesQuery = `
          SELECT 
            ib.batch_code,
            ib.quantity,
            ib.expiry_date,
            ib.import_date,
            ib.status AS batch_status
          FROM master.inventory_batch ib
          JOIN master.inventory_product ip ON ib.inventory_product_id = ip.inventory_product_id
          WHERE ip.product_id = $1
          ORDER BY ib.expiry_date NULLS LAST
        `;
        
        const batchesResult = await pool.query(batchesQuery, [product.product_id]);
        batches = batchesResult.rows.map(b => {
          const today = new Date().toISOString().split('T')[0];
          let expiry_status = null;
          let days_until_expiry = null;
          
          if (b.expiry_date) {
            if (b.expiry_date < today) {
              expiry_status = 'expired';
            } else {
              const expDate = new Date(b.expiry_date);
              const todayDate = new Date(today);
              days_until_expiry = Math.floor((expDate - todayDate) / (1000 * 60 * 60 * 24));
              expiry_status = days_until_expiry <= 30 ? 'near_expiry' : 'normal';
            }
          }
          
          return {
            ...b,
            expiry_status,
            days_until_expiry
          };
        });
      }
      
      productsWithBatches.push({
        product_id: product.product_id,
        code: product.code,
        name: product.name,
        category: product.category,
        unit: product.unit,
        quantity: product.total_quantity,
        min_stock: product.min_stock,
        selling_price: product.selling_price,
        warehouse_id: warehouseId,
        warehouse_name: warehouseName,
        warehouse_code: 'KHO',
        batches: batches
      });
    }

    // Step 3: Calculate summary (correctly, counting each product once)
    let inStock = 0;
    let outOfStock = 0;
    let nearExpiry = 0;
    let expired = 0;

    productsWithBatches.forEach(product => {
      
      if (product.quantity > 0) {
        inStock++;
      } else {
        outOfStock++;
      }

      if (product.batches.some(b => b.expiry_status === 'near_expiry') && product.quantity > 0) {
        nearExpiry++;
      }
      
      if (product.batches.some(b => b.expiry_status === 'expired')) {
        expired++;
      }
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalProducts: productsWithBatches.length,
          inStock,
          outOfStock,
          nearExpiry,
          expired,
        },
        products: productsWithBatches,
      },
      message: 'Get inventory overview successful',
    });
  } catch (error) {
    console.error('Error in getInventoryOverview:', error);
    res.status(500).json({
      success: false,
      message: 'Error: ' + error.message,
    });
  }
}

module.exports = {
  getInventoryOverview,
};

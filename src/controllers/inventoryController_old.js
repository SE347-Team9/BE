const pool = require('../config/database');

// GET inventory overview with warehouse zones and batch info
async function getInventoryOverview(req, res) {
  try {
    const query = `
      SELECT 
        p.product_id,
        p.code,
        p.name,
        p.category,
        p.unit,
        COALESCE(ip.quantity, 0) AS quantity,
        50 AS min_stock,
        w.warehouse_id,
        w.name AS warehouse_name,
        w.code AS warehouse_code,
        ib.batch_code,
        ib.expiry_date,
        ib.import_date,
        ib.status AS batch_status,
        CASE 
          WHEN ib.expiry_date IS NULL THEN NULL
          WHEN ib.expiry_date < CURRENT_DATE THEN 'expired'
          WHEN ib.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'near_expiry'
          ELSE 'normal'
        END AS expiry_status,
        CASE 
          WHEN ib.expiry_date IS NOT NULL THEN 
            (ib.expiry_date - CURRENT_DATE)
          ELSE NULL
        END AS days_until_expiry
      FROM master.product p
      LEFT JOIN master.inventory_product ip ON ip.product_id = p.product_id
      LEFT JOIN master.warehouse w ON w.warehouse_id = ip.warehouse_id
      LEFT JOIN master.inventory_batch ib ON ib.inventory_product_id = ip.inventory_product_id
      ORDER BY 
        CASE w.name
          WHEN 'Kho thường' THEN 1
          WHEN 'Kho mát' THEN 2
          WHEN 'Kho đông lạnh' THEN 3
          ELSE 4
        END,
        days_until_expiry NULLS LAST,
        ip.quantity ASC
    `;
    
    const result = await pool.query(query);

    // Calculate summary statistics
    const uniqueProducts = new Set();
    let inStock = 0;
    let outOfStock = 0;
    let nearExpiry = 0;
    let expired = 0;

    result.rows.forEach(row => {
      uniqueProducts.add(row.product_id);
      
      if (row.quantity > 0) {
        inStock++;
      } else {
        outOfStock++;
      }

      if (row.expiry_status === 'near_expiry' && row.quantity > 0) {
        nearExpiry++;
      } else if (row.expiry_status === 'expired') {
        expired++;
      }
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalProducts: uniqueProducts.size,
          inStock,
          outOfStock,
          nearExpiry,
          expired,
        },
        products: result.rows,
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

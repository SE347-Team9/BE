const pool = require('../config/database');

// GET inventory overview
async function getInventoryOverview(req, res) {
  try {
    const query = `
      SELECT 
        p.product_id AS id,
        p.code,
        p.name,
        p.category,
        p.unit,
        p.price AS "unitPrice",
        COALESCE(SUM(s.quantity), 0) AS stock,
        p.status,
        p.created_at AS "createdAt",
        p.updated_at AS "updatedAt"
      FROM master.product p
      LEFT JOIN inventory.stock s ON s.product_id = p.product_id
      GROUP BY p.product_id, p.code, p.name, p.category, p.unit, p.price, p.status, p.created_at, p.updated_at
      ORDER BY stock ASC
    `;
    
    const result = await pool.query(query);

    // Calculate summary
    const totalProducts = result.rows.length;
    const totalStock = result.rows.reduce((sum, product) => sum + (product.stock || 0), 0);
    const lowStock = result.rows.filter(p => p.stock < 10).length;

    res.json({
      success: true,
      data: {
        summary: {
          totalProducts,
          totalStock,
          lowStock,
        },
        products: result.rows,
      },
      message: 'Get inventory overview successful',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error: ' + error.message,
    });
  }
}

module.exports = {
  getInventoryOverview,
};

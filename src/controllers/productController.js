const pool = require('../config/database');

// GET all products
async function getAllProducts(req, res) {
  try {
    const query = `
      SELECT 
        p.product_id AS id,
        p.code,
        p.name,
        p.category,
        p.unit,
        p.price AS "unitPrice",
        p.status,
        p.created_at AS "createdAt",
        p.updated_at AS "updatedAt",
        s.name AS "supplierName"
      FROM master.product p
      LEFT JOIN master.supplier s ON s.supplier_id = p.supplier_id
      ORDER BY p.created_at DESC
    `;
    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows,
      message: 'Get products successful',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error: ' + error.message,
    });
  }
}

// GET one product
async function getProductById(req, res) {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        p.product_id AS id,
        p.code,
        p.name,
        p.category,
        p.unit,
        p.price AS "unitPrice",
        p.supplier_id AS "supplierId",
        p.status,
        p.created_at AS "createdAt",
        p.updated_at AS "updatedAt"
      FROM master.product p
      WHERE p.product_id = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Get product successful',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error: ' + error.message,
    });
  }
}

// POST create product
async function createProduct(req, res) {
  try {
    const { code, name, category, unit, unitPrice, stock } = req.body;

    if (!code || !name) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const query = `
      INSERT INTO master.product (code, name, category, unit, price, status)
      VALUES ($1, $2, $3, $4, $5, 'active')
      RETURNING *
    `;

    const result = await pool.query(query, [
      code, name, category, unit, unitPrice
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Product created successfully',
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Product code already exists',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error: ' + error.message,
    });
  }
}

// PUT update product
async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const { name, category, unit, unitPrice, stock, status } = req.body;

    const query = `
      UPDATE master.product
      SET name = COALESCE($1, name),
          category = COALESCE($2, category),
          unit = COALESCE($3, unit),
          price = COALESCE($4, price),
          status = COALESCE($5, status)
      WHERE product_id = $6
      RETURNING *
    `;

    const result = await pool.query(query, [name, category, unit, unitPrice, status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Product updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error: ' + error.message,
    });
  }
}

// DELETE product
async function deleteProduct(req, res) {
  try {
    const { id } = req.params;

    const query = 'DELETE FROM master.product WHERE product_id = $1 RETURNING *';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Product deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error: ' + error.message,
    });
  }
}

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};

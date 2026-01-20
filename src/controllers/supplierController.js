const pool = require('../config/database');

// GET all suppliers
async function getAllSuppliers(req, res) {
  try {
    const query = `
      SELECT 
        supplier_id AS id,
        code,
        name,
        contact_person AS "contactPerson",
        phone,
        email,
        address,
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM master.supplier
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows,
      message: 'Get suppliers successful',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error: ' + error.message,
    });
  }
}

// GET one supplier
async function getSupplierById(req, res) {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        supplier_id AS id,
        code,
        name,
        contact_person AS "contactPerson",
        phone,
        email,
        address,
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM master.supplier
      WHERE supplier_id = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Get supplier successful',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error: ' + error.message,
    });
  }
}

// POST create supplier
async function createSupplier(req, res) {
  try {
    const { code, name, contactPerson, phone, email, address } = req.body;

    if (!code || !name) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const query = `
      INSERT INTO master.supplier (code, name, contact_person, phone, email, address, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'active')
      RETURNING *
    `;

    const result = await pool.query(query, [
      code, name, contactPerson, phone, email, address
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Supplier created successfully',
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Supplier code already exists',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error: ' + error.message,
    });
  }
}

// PUT update supplier
async function updateSupplier(req, res) {
  try {
    const { id } = req.params;
    const { name, contactPerson, phone, email, address, status } = req.body;

    const query = `
      UPDATE master.supplier
      SET name = COALESCE($1, name),
          contact_person = COALESCE($2, contact_person),
          phone = COALESCE($3, phone),
          email = COALESCE($4, email),
          address = COALESCE($5, address),
          status = COALESCE($6, status)
      WHERE supplier_id = $7
      RETURNING *
    `;

    const result = await pool.query(query, [name, contactPerson, phone, email, address, status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Supplier updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error: ' + error.message,
    });
  }
}

// DELETE supplier
async function deleteSupplier(req, res) {
  try {
    const { id } = req.params;

    const query = 'DELETE FROM master.supplier WHERE supplier_id = $1 RETURNING *';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Supplier deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error: ' + error.message,
    });
  }
}

module.exports = {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
};

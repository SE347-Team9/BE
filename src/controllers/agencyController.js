const pool = require('../config/database');

// GET all agencies
async function getAllAgencies(req, res) {
  try {
    const query = `
      SELECT 
        ag.agency_id AS id,
        ag.code,
        ag.name,
        ag.address,
        ag.phone,
        ag.email,
        ag.level,
        ag.sales_volume AS "salesVolume",
        ag.current_debt AS "currentDebt",
        ag.debt_limit AS "debtLimit",
        ag.status,
        ag.created_at AS "createdAt",
        ag.updated_at AS "updatedAt",
        st.full_name AS "managerName"
      FROM master.agency ag
      LEFT JOIN master.staff st ON st.staff_id = ag.managed_by_staff_id
      ORDER BY ag.created_at DESC
    `;
    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows,
      message: 'Get agencies successful',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error: ' + error.message,
    });
  }
}

// GET one agency
async function getAgencyById(req, res) {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        ag.agency_id AS id,
        ag.code,
        ag.name,
        ag.address,
        ag.phone,
        ag.email,
        ag.level,
        ag.sales_volume AS "salesVolume",
        ag.current_debt AS "currentDebt",
        ag.debt_limit AS "debtLimit",
        ag.managed_by_staff_id AS "managerId",
        ag.status,
        ag.created_at AS "createdAt",
        ag.updated_at AS "updatedAt",
        st.full_name AS "managerName"
      FROM master.agency ag
      LEFT JOIN master.staff st ON st.staff_id = ag.managed_by_staff_id
      WHERE ag.agency_id = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Agency not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Get agency successful',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error: ' + error.message,
    });
  }
}

// POST create agency
async function createAgency(req, res) {
  try {
    const { code, name, location, address, phone, email, managerId } = req.body;

    if (!code || !name) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const query = `
      INSERT INTO master.agency (code, name, address, phone, email, level, sales_volume, current_debt, managed_by_staff_id, status)
      VALUES ($1, $2, $3, $4, $5, 3, 0, 0, $6, 'active')
      RETURNING *
    `;

    const result = await pool.query(query, [
      code, name, address, phone, email, managerId
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Agency created successfully',
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Agency code already exists',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error: ' + error.message,
    });
  }
}

// PUT update agency
async function updateAgency(req, res) {
  try {
    const { id } = req.params;
    const { name, location, address, phone, email, status } = req.body;

    const query = `
      UPDATE master.agency
      SET name = COALESCE($1, name),
          address = COALESCE($2, address),
          phone = COALESCE($3, phone),
          email = COALESCE($4, email),
          status = COALESCE($5, status)
      WHERE agency_id = $6
      RETURNING *
    `;

    const result = await pool.query(query, [name, address, phone, email, status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Agency not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Agency updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error: ' + error.message,
    });
  }
}

// DELETE agency
async function deleteAgency(req, res) {
  try {
    const { id } = req.params;

    const query = 'DELETE FROM agencies WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Agency not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Agency deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error: ' + error.message,
    });
  }
}

module.exports = {
  getAllAgencies,
  getAgencyById,
  createAgency,
  updateAgency,
  deleteAgency,
};

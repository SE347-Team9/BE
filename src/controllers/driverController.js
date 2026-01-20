const pool = require('../config/database');

// GET all drivers (staff)
async function getAllDrivers(req, res) {
  try {
    const query = `
      SELECT 
        staff_id AS id,
        code,
        full_name AS name,
        phone,
        email,
        position,
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM master.staff
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows,
      message: 'Get drivers successful',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error: ' + error.message,
    });
  }
}

// GET one driver (staff)
async function getDriverById(req, res) {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        staff_id AS id,
        code,
        full_name AS name,
        phone,
        email,
        position,
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM master.staff
      WHERE staff_id = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Get driver successful',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error: ' + error.message,
    });
  }
}

// POST create driver (staff)
async function createDriver(req, res) {
  try {
    const { code, name, phone, email, position } = req.body;

    if (!code || !name) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const query = `
      INSERT INTO master.staff (code, full_name, phone, email, position, status)
      VALUES ($1, $2, $3, $4, $5, 'active')
      RETURNING *
    `;

    const result = await pool.query(query, [
      code, name, phone, email, position || 'Staff'
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Driver created successfully',
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Driver code already exists',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error: ' + error.message,
    });
  }
}

// PUT update driver (staff)
async function updateDriver(req, res) {
  try {
    const { id } = req.params;
    const { name, phone, email, position, status } = req.body;

    const query = `
      UPDATE master.staff
      SET full_name = COALESCE($1, full_name),
          phone = COALESCE($2, phone),
          email = COALESCE($3, email),
          position = COALESCE($4, position),
          status = COALESCE($5, status)
      WHERE staff_id = $6
      RETURNING *
    `;

    const result = await pool.query(query, [name, phone, email, position, status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Driver updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error: ' + error.message,
    });
  }
}

// DELETE driver
async function deleteDriver(req, res) {
  try {
    const { id } = req.params;

    const query = 'DELETE FROM master.staff WHERE staff_id = $1 RETURNING *';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Driver deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error: ' + error.message,
    });
  }
}

module.exports = {
  getAllDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  deleteDriver,
};

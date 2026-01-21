const pool = require('../config/database');

// GET all agencies
async function getAllAgencies(req, res) {
  try {
    // Check if user is staff - only show agencies they manage
    const userRole = req.user?.role;
    const userId = req.user?.userId;
    
    let query = `
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
        ag.managed_by_staff_id AS "managedByStaffId",
        ag.status,
        ag.created_at AS "createdAt",
        ag.updated_at AS "updatedAt",
        st.full_name AS "managerName"
      FROM master.agency ag
      LEFT JOIN master.staff st ON st.staff_id = ag.managed_by_staff_id
    `;
    
    // If user is staff, only show agencies they manage
    if (userRole === 'staff' && userId) {
      // Get staff_id from auth.user using user_id
      const staffQuery = 'SELECT staff_id FROM auth."user" WHERE user_id = $1';
      const staffResult = await pool.query(staffQuery, [userId]);
      
      if (staffResult.rows.length > 0 && staffResult.rows[0].staff_id) {
        const staffId = staffResult.rows[0].staff_id;
        query += ` WHERE ag.managed_by_staff_id = $1`;
        query += ` ORDER BY ag.created_at DESC`;
        const result = await pool.query(query, [staffId]);
        
        return res.json({
          success: true,
          data: result.rows,
          message: 'Get agencies successful',
        });
      } else {
        // Staff not found or has no staff_id, return empty
        return res.json({
          success: true,
          data: [],
          message: 'No agencies found',
        });
      }
    }
    
    // Admin sees all agencies
    query += ` ORDER BY ag.created_at DESC`;
    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows,
      message: 'Get agencies successful',
    });
  } catch (error) {
    console.error('Get agencies error:', error);
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
        ag.managed_by_staff_id AS "managedByStaffId",
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
    const { name, location, address, phone, email, status, managedByStaffId } = req.body;

    console.log('Update agency request', { id, body: req.body });

    console.log('Update agency request:', { id, managedByStaffId, body: req.body });

    // Build dynamic query based on provided fields
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (address !== undefined) {
      updates.push(`address = $${paramIndex++}`);
      values.push(address);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(phone);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(email);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    if (managedByStaffId !== undefined) {
      updates.push(`managed_by_staff_id = $${paramIndex++}`);
      values.push(managedByStaffId);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update',
      });
    }

    values.push(id); // Add id as last parameter
    const query = `
      UPDATE master.agency
      SET ${updates.join(', ')}
      WHERE agency_id = $${paramIndex}
      RETURNING *
    `;

    console.log('Executing update agency query', { query, values });

    const result = await pool.query(query, values);

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

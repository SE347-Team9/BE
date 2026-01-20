const pool = require('../config/database');

// GET all regulations
async function getAllRegulations(req, res) {
  try {
    const query = `
      SELECT 
        regulation_key AS key,
        regulation_value AS value,
        description,
        data_type AS "dataType",
        updated_at AS "updatedAt"
      FROM config.regulation
      ORDER BY regulation_key
    `;
    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows,
      message: 'Get regulations successful',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error: ' + error.message,
    });
  }
}

// GET one regulation
async function getRegulationById(req, res) {
  try {
    const { id } = req.params; // id là regulation_key

    const query = `
      SELECT 
        regulation_key AS key,
        regulation_value AS value,
        description,
        data_type AS "dataType",
        updated_at AS "updatedAt"
      FROM config.regulation
      WHERE regulation_key = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Regulation not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Get regulation successful',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error: ' + error.message,
    });
  }
}

// POST create regulation
async function createRegulation(req, res) {
  try {
    const { key, value, description, dataType } = req.body;

    if (!key || !value) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const query = `
      INSERT INTO config.regulation (regulation_key, regulation_value, description, data_type, last_updated_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await pool.query(query, [
      key, value, description, dataType || 'text', req.user.userId
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Regulation created successfully',
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Regulation code already exists',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error: ' + error.message,
    });
  }
}

// PUT update regulation
async function updateRegulation(req, res) {
  try {
    const { id } = req.params; // id là regulation_key
    const { value, description } = req.body;

    const query = `
      UPDATE config.regulation
      SET regulation_value = COALESCE($1, regulation_value),
          description = COALESCE($2, description),
          content = COALESCE($3, content),
          category = COALESCE($4, category),
          "effectiveDate" = COALESCE($5, "effectiveDate"),
          status = COALESCE($6, status),
          "updatedAt" = NOW()
      WHERE id = $7
      RETURNING *
    `;

    const result = await pool.query(query, [title, description, content, category, effectiveDate, status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Regulation not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Regulation updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error: ' + error.message,
    });
  }
}

// DELETE regulation
async function deleteRegulation(req, res) {
  try {
    const { id } = req.params;

    const query = 'DELETE FROM regulations WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Regulation not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Regulation deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error: ' + error.message,
    });
  }
}

module.exports = {
  getAllRegulations,
  getRegulationById,
  createRegulation,
  updateRegulation,
  deleteRegulation,
};

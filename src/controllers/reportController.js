const pool = require('../config/database');

// GET all reports
async function getAllReports(req, res) {
  try {
    const query = 'SELECT * FROM reports ORDER BY "createdAt" DESC';
    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows,
      message: 'Get reports successful',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error: ' + error.message,
    });
  }
}

// GET one report
async function getReportById(req, res) {
  try {
    const { id } = req.params;

    const query = 'SELECT * FROM reports WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Get report successful',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error: ' + error.message,
    });
  }
}

// POST create report
async function createReport(req, res) {
  try {
    const { code, title, type, period, data } = req.body;

    if (!code || !title || !type) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const query = `
      INSERT INTO reports (code, title, type, period, data, "createdBy", status)
      VALUES ($1, $2, $3, $4, $5, $6, 'draft')
      RETURNING *
    `;

    const result = await pool.query(query, [
      code, title, type, period, data, req.user.userId
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Report created successfully',
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Report code already exists',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error: ' + error.message,
    });
  }
}

// PUT update report
async function updateReport(req, res) {
  try {
    const { id } = req.params;
    const { title, type, period, data, status } = req.body;

    const query = `
      UPDATE reports
      SET title = COALESCE($1, title),
          type = COALESCE($2, type),
          period = COALESCE($3, period),
          data = COALESCE($4, data),
          status = COALESCE($5, status),
          "updatedAt" = NOW()
      WHERE id = $6
      RETURNING *
    `;

    const result = await pool.query(query, [title, type, period, data, status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Report updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error: ' + error.message,
    });
  }
}

// DELETE report
async function deleteReport(req, res) {
  try {
    const { id } = req.params;

    const query = 'DELETE FROM reports WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Report deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error: ' + error.message,
    });
  }
}

module.exports = {
  getAllReports,
  getReportById,
  createReport,
  updateReport,
  deleteReport,
};

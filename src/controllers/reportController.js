const pool = require('../config/database');

async function getStaffIdByAccountId(accountId) {
  const result = await pool.query('SELECT staff_id FROM auth."user" WHERE account_id = $1', [accountId]);
  return result.rows[0]?.staff_id || null;
}

async function getAgenciesManagedByStaff(staffId) {
  const result = await pool.query('SELECT agency_id, code FROM master.agency WHERE managed_by_staff_id = $1', [staffId]);
  return result.rows;
}

async function mapAgencyCodesToIds(codes) {
  if (!codes.length) return [];
  const result = await pool.query('SELECT id, code FROM agencies WHERE code = ANY($1)', [codes]);
  return result.rows.map(r => r.id);
}

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
  // Summary for staff/admin: totals filtered by managed agencies for staff
  getSummary: async (req, res) => {
    try {
      const { role, userId } = req.user || {};

      let agencyIds = [];

      if (role === 'staff') {
        const staffId = await getStaffIdByAccountId(userId);
        if (!staffId) {
          return res.status(403).json({ success: false, message: 'Staff profile not found for this account' });
        }

        const managedAgencies = await getAgenciesManagedByStaff(staffId);
        if (managedAgencies.length === 0) {
          return res.json({
            success: true,
            data: {
              totalImportValue: 0,
              totalDistributionValue: 0,
              totalDebt: 0,
            }
          });
        }

        const agencyCodes = managedAgencies.map(a => a.code);
        agencyIds = await mapAgencyCodesToIds(agencyCodes);

        if (!agencyIds.length) {
          return res.json({
            success: true,
            data: {
              totalImportValue: 0,
              totalDistributionValue: 0,
              totalDebt: 0,
            }
          });
        }
      }

      // Admin and other roles see all agencies
      const whereClause = agencyIds.length ? 'WHERE agency_id = ANY($1)' : '';
      const params = agencyIds.length ? [agencyIds] : [];

      const importQuery = `SELECT COALESCE(SUM(total_amount), 0) AS total FROM imports ${whereClause}`;
      const distributionQuery = `SELECT COALESCE(SUM(total_amount), 0) AS total FROM distributions ${whereClause}`;
      const debtQuery = `SELECT COALESCE(SUM(current_debt), 0) AS total FROM agencies ${whereClause}`;

      const [importResult, distributionResult, debtResult] = await Promise.all([
        pool.query(importQuery, params),
        pool.query(distributionQuery, params),
        pool.query(debtQuery, params)
      ]);

      res.json({
        success: true,
        data: {
          totalImportValue: parseFloat(importResult.rows[0].total) || 0,
          totalDistributionValue: parseFloat(distributionResult.rows[0].total) || 0,
          totalDebt: parseFloat(debtResult.rows[0].total) || 0,
        }
      });
    } catch (error) {
      console.error('Error getting report summary:', error);
      res.status(500).json({ success: false, message: 'Error: ' + error.message });
    }
  },
};

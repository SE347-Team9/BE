const pool = require('../config/database');

// Get dashboard statistics
async function getStats(req, res) {
  try {
    const { role, agencyId } = req.user;

    if (role === 'agency') {
      // Check if agencyId exists
      if (!agencyId) {
        return res.status(400).json({
          success: false,
          message: 'Agency ID not found. Please login again.'
        });
      }

      // Agency dashboard stats
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      // Get agency info including debt
      const agencyQuery = `
        SELECT current_debt, credit_limit 
        FROM agencies 
        WHERE id = $1
      `;
      const agencyResult = await pool.query(agencyQuery, [agencyId]);
      const agencyData = agencyResult.rows[0] || { current_debt: 0, credit_limit: 0 };

      // Count imports this month
      const importsQuery = `
        SELECT COUNT(*) as count
        FROM imports
        WHERE "agency_id" = $1
        AND EXTRACT(MONTH FROM "createdAt") = $2
        AND EXTRACT(YEAR FROM "createdAt") = $3
      `;
      const importsResult = await pool.query(importsQuery, [agencyId, currentMonth, currentYear]);

      // Sum payments this month
      const paymentsQuery = `
        SELECT COALESCE(SUM(amount), 0) as total
        FROM payments
        WHERE "agency_id" = $1
        AND EXTRACT(MONTH FROM "createdAt") = $2
        AND EXTRACT(YEAR FROM "createdAt") = $3
      `;
      const paymentsResult = await pool.query(paymentsQuery, [agencyId, currentMonth, currentYear]);

      // Get last 6 months debt trend
      const debtTrendQuery = `
        SELECT 
          TO_CHAR(month_date, 'TMon') as month,
          COALESCE(SUM(amount), 0) as debt
        FROM generate_series(
          date_trunc('month', CURRENT_DATE - interval '5 months'),
          date_trunc('month', CURRENT_DATE),
          '1 month'::interval
        ) AS month_date
        LEFT JOIN payments ON 
          date_trunc('month', payments."createdAt") = month_date
          AND payments."agency_id" = $1
        GROUP BY month_date
        ORDER BY month_date
      `;
      const debtTrendResult = await pool.query(debtTrendQuery, [agencyId]);

      // Get last 6 months payment trend
      const paymentTrendQuery = `
        SELECT 
          TO_CHAR(month_date, 'TMon') as month,
          COALESCE(SUM(amount), 0) as total
        FROM generate_series(
          date_trunc('month', CURRENT_DATE - interval '5 months'),
          date_trunc('month', CURRENT_DATE),
          '1 month'::interval
        ) AS month_date
        LEFT JOIN payments ON 
          date_trunc('month', payments."createdAt") = month_date
          AND payments."agency_id" = $1
          AND payments.status = 'confirmed'
        GROUP BY month_date
        ORDER BY month_date
      `;
      const paymentTrendResult = await pool.query(paymentTrendQuery, [agencyId]);

      return res.json({
        success: true,
        data: {
          currentDebt: parseFloat(agencyData.current_debt) || 0,
          creditLimit: parseFloat(agencyData.credit_limit) || 0,
          monthlyImports: parseInt(importsResult.rows[0].count) || 0,
          monthlyPayments: parseFloat(paymentsResult.rows[0].total) || 0,
          debtTrend: debtTrendResult.rows,
          paymentTrend: paymentTrendResult.rows
        }
      });
    } else if (role === 'staff') {
      // Staff dashboard stats
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      // Count total agencies
      const agenciesQuery = `SELECT COUNT(*) as count FROM agencies WHERE status = 'active'`;
      const agenciesResult = await pool.query(agenciesQuery);

      // Count exports this month
      const exportsQuery = `
        SELECT COUNT(*) as count
        FROM distributions
        WHERE EXTRACT(MONTH FROM "createdAt") = $1
        AND EXTRACT(YEAR FROM "createdAt") = $2
      `;
      const exportsResult = await pool.query(exportsQuery, [currentMonth, currentYear]);

      // Sum total debt
      const debtQuery = `SELECT COALESCE(SUM(current_debt), 0) as total FROM agencies`;
      const debtResult = await pool.query(debtQuery);

      // Sum payments this month
      const paymentsQuery = `
        SELECT COALESCE(SUM(amount), 0) as total
        FROM payments
        WHERE EXTRACT(MONTH FROM "createdAt") = $1
        AND EXTRACT(YEAR FROM "createdAt") = $2
        AND status = 'confirmed'
      `;
      const paymentsResult = await pool.query(paymentsQuery, [currentMonth, currentYear]);

      // Get last 6 months distribution vs import values
      const distributionQuery = `
        SELECT 
          TO_CHAR(month_date, 'TMon') as month,
          COALESCE(SUM(d.total), 0) as distribution_value,
          COALESCE(SUM(i.total), 0) as import_value
        FROM generate_series(
          date_trunc('month', CURRENT_DATE - interval '5 months'),
          date_trunc('month', CURRENT_DATE),
          '1 month'::interval
        ) AS month_date
        LEFT JOIN distributions d ON date_trunc('month', d."createdAt") = month_date
        LEFT JOIN imports i ON date_trunc('month', i."createdAt") = month_date
        GROUP BY month_date
        ORDER BY month_date
      `;
      const distributionResult = await pool.query(distributionQuery);

      return res.json({
        success: true,
        data: {
          totalAgencies: parseInt(agenciesResult.rows[0].count) || 0,
          monthlyExports: parseInt(exportsResult.rows[0].count) || 0,
          totalDebt: parseFloat(debtResult.rows[0].total) || 0,
          monthlyPayments: parseFloat(paymentsResult.rows[0].total) || 0,
          distributionTrend: distributionResult.rows
        }
      });
    } else if (role === 'admin') {
      // Admin dashboard stats
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      // Count total agencies
      const agenciesQuery = `SELECT COUNT(*) as count FROM agencies WHERE status = 'active'`;
      const agenciesResult = await pool.query(agenciesQuery);

      // Count total products
      const productsQuery = `SELECT COUNT(*) as count FROM products WHERE status = 'available'`;
      const productsResult = await pool.query(productsQuery);

      // Sum total inventory value
      const inventoryQuery = `
        SELECT COALESCE(SUM(stock * "unitPrice"), 0) as total 
        FROM products 
        WHERE status = 'available'
      `;
      const inventoryResult = await pool.query(inventoryQuery);

      // Count distributions this month
      const distributionsQuery = `
        SELECT COUNT(*) as count
        FROM distributions
        WHERE EXTRACT(MONTH FROM "createdAt") = $1
        AND EXTRACT(YEAR FROM "createdAt") = $2
      `;
      const distributionsResult = await pool.query(distributionsQuery, [currentMonth, currentYear]);

      // Get monthly statistics for last 6 months
      const monthlyStatsQuery = `
        SELECT 
          TO_CHAR(month_date, 'TMon') as month,
          COALESCE(SUM(d.total), 0) as distribution_value,
          COALESCE(SUM(i.total), 0) as import_value,
          COALESCE(SUM(p.amount), 0) as payment_value
        FROM generate_series(
          date_trunc('month', CURRENT_DATE - interval '5 months'),
          date_trunc('month', CURRENT_DATE),
          '1 month'::interval
        ) AS month_date
        LEFT JOIN distributions d ON date_trunc('month', d."createdAt") = month_date
        LEFT JOIN imports i ON date_trunc('month', i."createdAt") = month_date
        LEFT JOIN payments p ON date_trunc('month', p."createdAt") = month_date AND p.status = 'confirmed'
        GROUP BY month_date
        ORDER BY month_date
      `;
      const monthlyStatsResult = await pool.query(monthlyStatsQuery);

      return res.json({
        success: true,
        data: {
          totalAgencies: parseInt(agenciesResult.rows[0].count) || 0,
          totalProducts: parseInt(productsResult.rows[0].count) || 0,
          totalInventoryValue: parseFloat(inventoryResult.rows[0].total) || 0,
          monthlyDistributions: parseInt(distributionsResult.rows[0].count) || 0,
          monthlyStats: monthlyStatsResult.rows
        }
      });
    }

    return res.status(403).json({
      success: false,
      message: 'Unauthorized'
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

module.exports = {
  getStats
};

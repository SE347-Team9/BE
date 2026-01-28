const pool = require('../config/database');

/**
 * Agency Receive Controller
 * Derived from distributions created by staff exports
 */

// List agency receives (for current agency)
const getAgencyReceives = async (req, res) => {
  try {
    const { role, agencyId } = req.user;

    if (!agencyId) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin đại lý' });
    }

    // Agencies see their own export-based receive records (only PX codes)
    const query = `
      SELECT 
        d.distribution_id AS id,
        REPLACE(d.distribution_code, 'PX', 'PNHAN') AS code,
        d.order_date AS delivery_date,
        d.receive_date,
        d.total_amount,
        d.status,
        d.created_at,
        d.updated_at,
        COALESCE(SUM(dd.quantity), 0) AS product_count
      FROM ordermgmt.distribution d
      LEFT JOIN ordermgmt.distribution_detail dd ON d.distribution_id = dd.distribution_id
      WHERE d.agency_id = $1 AND d.distribution_code LIKE 'PX%'
      GROUP BY d.distribution_id
      ORDER BY d.created_at DESC`;

    const result = await pool.query(query, [agencyId]);

    return res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching agency receives:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi tải danh sách phiếu nhận đại lý' });
  }
};

// Confirm receive by agency
const confirmAgencyReceive = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params; // distribution_id
    const { role, agencyId } = req.user;

    if (role !== 'agency') {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Chỉ đại lý mới có thể xác nhận nhận hàng' });
    }

    // Ensure the distribution belongs to this agency
    const checkResult = await client.query(
      'SELECT distribution_id, status FROM ordermgmt.distribution WHERE distribution_id = $1 AND agency_id = $2',
      [id, agencyId]
    );

    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu nhận của đại lý' });
    }

    const currentStatus = checkResult.rows[0].status;

    // Allow confirm only from pending status (chờ xác nhận)
    if (currentStatus !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Chỉ có thể xác nhận phiếu ở trạng thái chờ xác nhận' });
    }

    const updateResult = await client.query(
      `UPDATE ordermgmt.distribution
       SET status = 'delivered', receive_date = CURRENT_DATE, updated_at = NOW()
       WHERE distribution_id = $1 AND agency_id = $2
       RETURNING distribution_id AS id, distribution_code AS code, delivery_date, receive_date, total_amount, status, updated_at`,
      [id, agencyId]
    );

    await client.query('COMMIT');

    return res.json({ success: true, message: 'Xác nhận nhận hàng thành công', data: updateResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error confirming agency receive:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi xác nhận nhận hàng' });
  } finally {
    client.release();
  }
};

// Update distribution status to pending (used by staff when creating shipment)
const updateStatusToPending = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params; // distribution_id
    const { role } = req.user;

    if (role !== 'staff' && role !== 'admin') {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Chỉ nhân viên mới có thể cập nhật trạng thái' });
    }

    const updateResult = await client.query(
      `UPDATE ordermgmt.distribution
       SET status = 'pending', updated_at = NOW()
       WHERE distribution_id = $1
       RETURNING distribution_id AS id, distribution_code AS code, delivery_date, receive_date, total_amount, status, updated_at`,
      [id]
    );

    if (updateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu nhận' });
    }

    await client.query('COMMIT');

    return res.json({ success: true, message: 'Cập nhật trạng thái thành công', data: updateResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating status to pending:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi cập nhật trạng thái' });
  } finally {
    client.release();
  }
};

module.exports = { getAgencyReceives, confirmAgencyReceive, updateStatusToPending };

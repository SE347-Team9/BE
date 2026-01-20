const pool = require('../config/database');
const { emitToRole, emitToUser, EVENTS } = require('../utils/socket');

/**
 * Payment Controller
 * Handles payment records and debt management
 */

// Get all payments (filtered by role)
const getAllPayments = async (req, res) => {
  try {
    const { role, agencyId } = req.user;
    
    let query;
    let params = [];
    
    if (role === 'agency') {
      // Agency can only see their own payments
      query = `
        SELECT p.*, a.name as agency_name, a.code as agency_code,
               acc.username as created_by_name
        FROM payments p
        LEFT JOIN agencies a ON p.agency_id = a.id
        LEFT JOIN accounts acc ON p.created_by = acc.id
        WHERE p.agency_id = $1
        ORDER BY p.created_at DESC
      `;
      params = [agencyId];
    } else {
      // Staff and admin can see all payments
      query = `
        SELECT p.*, a.name as agency_name, a.code as agency_code,
               acc.username as created_by_name
        FROM payments p
        LEFT JOIN agencies a ON p.agency_id = a.id
        LEFT JOIN accounts acc ON p.created_by = acc.id
        ORDER BY p.created_at DESC
      `;
    }
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải danh sách thanh toán'
    });
  }
};

// Get payment by ID
const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, agencyId } = req.user;
    
    let query = `
      SELECT p.*, a.name as agency_name, a.code as agency_code,
             a.address as agency_address, a.phone as agency_phone,
             acc.username as created_by_name
      FROM payments p
      LEFT JOIN agencies a ON p.agency_id = a.id
      LEFT JOIN accounts acc ON p.created_by = acc.id
      WHERE p.id = $1
    `;
    
    const params = [id];
    
    // Agency can only view their own payments
    if (role === 'agency') {
      query += ' AND p.agency_id = $2';
      params.push(agencyId);
    }
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phiếu thanh toán'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải thông tin thanh toán'
    });
  }
};

// Create new payment
const createPayment = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { amount, paymentDate, notes } = req.body;
    const { userId, role, agencyId } = req.user;
    
    // Validate
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Số tiền thanh toán không hợp lệ'
      });
    }
    
    // Get agency ID
    let targetAgencyId;
    if (role === 'agency') {
      targetAgencyId = agencyId;
    } else {
      // Staff/admin must specify agency
      targetAgencyId = req.body.agencyId;
      if (!targetAgencyId) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn đại lý'
        });
      }
    }
    
    // Get agency current debt
    const agencyResult = await client.query(
      'SELECT current_debt FROM agencies WHERE id = $1',
      [targetAgencyId]
    );
    
    if (agencyResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đại lý'
      });
    }
    
    const currentDebt = agencyResult.rows[0].current_debt || 0;
    
    if (amount > currentDebt) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Số tiền thanh toán vượt quá công nợ hiện tại (${currentDebt.toLocaleString('vi-VN')} VND)`
      });
    }
    
    // Generate payment code
    const codeResult = await client.query(
      'SELECT COUNT(*) as count FROM payments'
    );
    const count = parseInt(codeResult.rows[0].count) + 1;
    const code = `PT${String(count).padStart(5, '0')}`;
    
    // Insert payment
    const insertResult = await client.query(
      `INSERT INTO payments (code, agency_id, amount, payment_date, notes, status, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [code, targetAgencyId, amount, paymentDate || new Date(), notes, 'pending', userId]
    );
    
    const payment = insertResult.rows[0];
    
    await client.query('COMMIT');
    
    // Emit socket event to staff
    const io = req.app.get('io');
    if (io) {
      emitToRole(io, 'staff', EVENTS.PAYMENT_CREATED, {
        id: payment.id,
        code: payment.code,
        amount: payment.amount,
        message: 'Có phiếu thanh toán mới'
      });
    }
    
    res.status(201).json({
      success: true,
      data: payment,
      message: 'Tạo phiếu thanh toán thành công'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating payment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi tạo phiếu thanh toán'
    });
  } finally {
    client.release();
  }
};

// Confirm payment (staff/admin only)
const confirmPayment = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { role } = req.user;
    
    if (role === 'agency') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện thao tác này'
      });
    }
    
    // Get payment
    const paymentResult = await client.query(
      'SELECT * FROM payments WHERE id = $1',
      [id]
    );
    
    if (paymentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phiếu thanh toán'
      });
    }
    
    const payment = paymentResult.rows[0];
    
    if (payment.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Phiếu thanh toán này đã được xử lý'
      });
    }
    
    // Update payment status
    await client.query(
      `UPDATE payments 
       SET status = 'completed', updated_at = NOW()
       WHERE id = $1`,
      [id]
    );
    
    // Update agency debt
    await client.query(
      `UPDATE agencies 
       SET current_debt = current_debt - $1, updated_at = NOW()
       WHERE id = $2`,
      [payment.amount, payment.agency_id]
    );
    
    const result = await client.query(
      'SELECT * FROM payments WHERE id = $1',
      [id]
    );
    
    // Get updated agency debt
    const agencyResult = await client.query(
      'SELECT current_debt FROM agencies WHERE id = $1',
      [payment.agency_id]
    );
    const newDebt = agencyResult.rows[0].current_debt;
    
    await client.query('COMMIT');
    
    // Emit socket events
    const io = req.app.get('io');
    if (io) {
      // Notify agency about payment confirmation
      emitToRole(io, 'agency', EVENTS.PAYMENT_CONFIRMED, {
        id: result.rows[0].id,
        code: result.rows[0].code,
        amount: payment.amount,
        message: 'Thanh toán đã được xác nhận'
      });
      // Notify about debt change
      emitToRole(io, 'agency', EVENTS.AGENCY_DEBT_CHANGED, {
        agencyId: payment.agency_id,
        newDebt: newDebt,
        message: `Công nợ mới: ${newDebt.toLocaleString('vi-VN')} VND`
      });
      // Also notify staff
      emitToRole(io, 'staff', EVENTS.PAYMENT_CONFIRMED, {
        id: result.rows[0].id,
        code: result.rows[0].code,
        amount: payment.amount,
        message: 'Thanh toán đã được xác nhận'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Xác nhận thanh toán thành công'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error confirming payment:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xác nhận thanh toán'
    });
  } finally {
    client.release();
  }
};

// Get agency debt info
const getDebtInfo = async (req, res) => {
  try {
    const { role, agencyId } = req.user;
    
    let targetAgencyId;
    
    if (role === 'agency') {
      targetAgencyId = agencyId;
    } else {
      // Staff/admin can query specific agency
      targetAgencyId = req.query.agencyId || req.params.agencyId;
      if (!targetAgencyId) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn đại lý'
        });
      }
    }
    
    const result = await pool.query(
      `SELECT id, code, name, current_debt, credit_limit,
              (credit_limit - current_debt) as available_credit
       FROM agencies 
       WHERE id = $1`,
      [targetAgencyId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đại lý'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching debt info:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải thông tin công nợ'
    });
  }
};

// Cancel payment
const cancelPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, agencyId } = req.user;
    
    // Check if payment exists
    let checkQuery = 'SELECT * FROM payments WHERE id = $1';
    const checkParams = [id];
    
    if (role === 'agency') {
      checkQuery += ' AND agency_id = $2';
      checkParams.push(agencyId);
    }
    
    const checkResult = await pool.query(checkQuery, checkParams);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phiếu thanh toán'
      });
    }
    
    const payment = checkResult.rows[0];
    
    // Can only cancel pending payments
    if (payment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể hủy phiếu thanh toán đang chờ xử lý'
      });
    }
    
    const result = await pool.query(
      `UPDATE payments 
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Hủy phiếu thanh toán thành công'
    });
  } catch (error) {
    console.error('Error cancelling payment:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi hủy phiếu thanh toán'
    });
  }
};

module.exports = {
  getAllPayments,
  getPaymentById,
  createPayment,
  confirmPayment,
  getDebtInfo,
  cancelPayment
};

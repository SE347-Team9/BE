const pool = require('../config/database');
const { emitToRole, emitToUser, EVENTS } = require('../utils/socket');

/**
 * Payment Controller
 * Handles payment records and debt management
 */

// Get all payments (filtered by role)
const getAllPayments = async (req, res) => {
  try {
    console.log('[getAllPayments] Called by user:', req.user);
    const { role, agencyId } = req.user;
    
    let query;
    let params = [];
    
    if (role === 'agency') {
      // Agency can only see their own payments
      query = `
        SELECT p.payment_id as id, p.code, p.agency_id,
               p.amount, p.payment_date, p.note as notes, p.status, 
               p.created_at, p.updated_at,
               a.name as agency_name, a.code as agency_code,
               acc.username as created_by_name
        FROM finance.payment p
        LEFT JOIN master.agency a ON p.agency_id = a.agency_id
        LEFT JOIN auth.account acc ON p.collected_by = acc.account_id
        WHERE p.agency_id = $1
        ORDER BY p.created_at DESC
      `;
      params = [agencyId];
    } else {
      // Staff and admin can see all payments
      query = `
        SELECT p.payment_id as id, p.code, p.agency_id,
               p.amount, p.payment_date, p.note as notes, p.status,
               p.created_at, p.updated_at,
               a.name as agency_name, a.code as agency_code,
               acc.username as created_by_name
        FROM finance.payment p
        LEFT JOIN master.agency a ON p.agency_id = a.agency_id
        LEFT JOIN auth.account acc ON p.collected_by = acc.account_id
        ORDER BY p.created_at DESC
      `;
    }
    
    const result = await pool.query(query, params);
    
    console.log('[getAllPayments] Found', result.rows.length, 'payments');
    console.log('[getAllPayments] First payment:', result.rows[0]);
    
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
      SELECT p.payment_id as id, p.code, p.agency_id,
             p.amount, p.payment_date, p.note as notes, p.status,
             p.created_at, p.updated_at,
             a.name as agency_name, a.code as agency_code,
             a.address as agency_address, a.phone as agency_phone,
             acc.username as created_by_name
      FROM finance.payment p
      LEFT JOIN master.agency a ON p.agency_id = a.agency_id
      LEFT JOIN auth.account acc ON p.collected_by = acc.account_id
      WHERE p.payment_id = $1
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
      'SELECT current_debt FROM master.agency WHERE agency_id = $1',
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
      'SELECT COUNT(*) as count FROM finance.payment'
    );
    const count = parseInt(codeResult.rows[0].count) + 1;
    const code = `PT${String(count).padStart(5, '0')}`;
    
    // Insert payment
    const insertResult = await client.query(
      `INSERT INTO finance.payment (code, agency_id, amount, payment_date, note, status, collected_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING payment_id as id, code, agency_id, amount, payment_date, note as notes, status, created_at, updated_at`,
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
    
    // Get payment
    const paymentResult = await client.query(
      'SELECT payment_id as id, code, agency_id, amount, status FROM finance.payment WHERE payment_id = $1',
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
    
    // Convert amount to number
    const paymentAmount = typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount;
    
    // Update payment status
    await client.query(
      `UPDATE finance.payment 
       SET status = 'completed', updated_at = NOW()
       WHERE payment_id = $1`,
      [id]
    );
    
    const result = await client.query(
      'SELECT payment_id as id, code, agency_id, amount, payment_date, note as notes, status, created_at, updated_at FROM finance.payment WHERE payment_id = $1',
      [id]
    );
    
    // Get agency info
    const agencyResult = await client.query(
      'SELECT current_debt FROM master.agency WHERE agency_id = $1',
      [payment.agency_id]
    );
    const currentDebt = agencyResult.rows[0] ? agencyResult.rows[0].current_debt : 0;
    
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
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Rollback error:', rollbackError);
    }
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
      `SELECT agency_id as id, code, name, current_debt, debt_limit as credit_limit,
              (debt_limit - current_debt) as available_credit
       FROM master.agency 
       WHERE agency_id = $1`,
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
    let checkQuery = 'SELECT payment_id as id, code, agency_id, amount, status FROM finance.payment WHERE payment_id = $1';
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
      `UPDATE finance.payment 
       SET status = 'cancelled', updated_at = NOW()
       WHERE payment_id = $1
       RETURNING payment_id as id, code, agency_id, amount, payment_date, note as notes, status, created_at, updated_at`,
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

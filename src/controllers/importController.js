const pool = require('../config/database');
const { emitToRole, EVENTS } = require('../utils/socket');

/**
 * Import Controller
 * Handles import/receive goods operations
 */

// Get all imports (filtered by role)
const getAllImports = async (req, res) => {
  try {
    const { role, agencyId } = req.user;
    
    let query;
    let params = [];
    
    if (role === 'agency') {
      // Agency can only see their own imports
      query = `
        SELECT i.*, d.code as distribution_code, a.name as agency_name, a.code as agency_code,
               acc.username as created_by_name,
               json_agg(json_build_object(
                 'product_id', ip.product_id,
                 'product_name', p.name,
                 'product_code', p.code,
                 'batch', ip.batch,
                 'mfg_date', ip.mfg_date,
                 'exp_date', ip.exp_date,
                 'quantity', ip.quantity,
                 'unit', p.unit,
                 'price', ip.price,
                 'subtotal', ip.quantity * ip.price
               )) as products
        FROM imports i
        LEFT JOIN distributions d ON i.distribution_id = d.id
        LEFT JOIN agencies a ON i.agency_id = a.id
        LEFT JOIN accounts acc ON i.created_by = acc.id
        LEFT JOIN import_products ip ON i.id = ip.import_id
        LEFT JOIN products p ON ip.product_id = p.id
        WHERE i.agency_id = $1
        GROUP BY i.id, d.code, a.name, a.code, acc.username
        ORDER BY i.created_at DESC
      `;
      params = [agencyId];
    } else {
      // Staff and admin can see all imports
      query = `
        SELECT i.*, d.code as distribution_code, a.name as agency_name, a.code as agency_code,
               acc.username as created_by_name,
               json_agg(json_build_object(
                 'product_id', ip.product_id,
                 'product_name', p.name,
                 'product_code', p.code,
                 'batch', ip.batch,
                 'mfg_date', ip.mfg_date,
                 'exp_date', ip.exp_date,
                 'quantity', ip.quantity,
                 'unit', p.unit,
                 'price', ip.price,
                 'subtotal', ip.quantity * ip.price
               )) as products
        FROM imports i
        LEFT JOIN distributions d ON i.distribution_id = d.id
        LEFT JOIN agencies a ON i.agency_id = a.id
        LEFT JOIN accounts acc ON i.created_by = acc.id
        LEFT JOIN import_products ip ON i.id = ip.import_id
        LEFT JOIN products p ON ip.product_id = p.id
        GROUP BY i.id, d.code, a.name, a.code, acc.username
        ORDER BY i.created_at DESC
      `;
    }
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching imports:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải danh sách nhập hàng'
    });
  }
};

// Get import by ID
const getImportById = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, agencyId } = req.user;
    
    let query = `
      SELECT i.*, d.code as distribution_code, a.name as agency_name, a.code as agency_code,
             a.address as agency_address, a.phone as agency_phone,
             acc.username as created_by_name,
             json_agg(json_build_object(
               'product_id', ip.product_id,
               'product_name', p.name,
               'product_code', p.code,
               'batch', ip.batch,
               'mfg_date', ip.mfg_date,
               'exp_date', ip.exp_date,
               'quantity', ip.quantity,
               'unit', p.unit,
               'price', ip.price,
               'subtotal', ip.quantity * ip.price
             )) as products
      FROM imports i
      LEFT JOIN distributions d ON i.distribution_id = d.id
      LEFT JOIN agencies a ON i.agency_id = a.id
      LEFT JOIN accounts acc ON i.created_by = acc.id
      LEFT JOIN import_products ip ON i.id = ip.import_id
      LEFT JOIN products p ON ip.product_id = p.id
      WHERE i.id = $1
    `;
    
    const params = [id];
    
    // Agency can only view their own imports
    if (role === 'agency') {
      query += ' AND i.agency_id = $2';
      params.push(agencyId);
    }
    
    query += ' GROUP BY i.id, d.code, a.name, a.code, a.address, a.phone, acc.username';
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phiếu nhập hàng'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching import:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải thông tin nhập hàng'
    });
  }
};

// Create new import (staff/admin only)
const createImport = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { distributionId, shipDate, receiveDate, products, notes } = req.body;
    const { userId, role } = req.user;
    
    // Only staff and admin can create imports
    if (role === 'agency') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện thao tác này'
      });
    }
    
    // Validate
    if (!products || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn ít nhất một sản phẩm'
      });
    }
    
    // Get distribution info
    let agencyId;
    let totalAmount = 0;
    
    if (distributionId) {
      const distResult = await client.query(
        'SELECT agency_id, total_amount FROM distributions WHERE id = $1',
        [distributionId]
      );
      
      if (distResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy phiếu phân phối'
        });
      }
      
      agencyId = distResult.rows[0].agency_id;
      totalAmount = distResult.rows[0].total_amount;
    } else {
      // Manual import without distribution (warehouse import from supplier)
      agencyId = req.body.agencyId || null;
      
      // Calculate total amount
      for (const product of products) {
        totalAmount += product.price * product.quantity;
      }
    }
    
    // Generate import code
    const codeResult = await client.query(
      'SELECT COUNT(*) as count FROM warehouse.import'
    );
    const count = parseInt(codeResult.rows[0].count) + 1;
    const code = `PN${String(count).padStart(5, '0')}`;
    
    // Insert import
    const insertResult = await client.query(
      `INSERT INTO warehouse.import (import_code, supplier_id, import_date, total_amount, notes, created_by, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [code, req.body.supplierId || null, shipDate, totalAmount, notes, userId, 'completed']
    );
    
    const importRecord = insertResult.rows[0];
    
    // Insert import products
    for (const product of products) {
      await client.query(
        `INSERT INTO warehouse.import_detail (import_id, product_id, batch_code, quantity, unit_price, total_price, manufacturing_date, expiry_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [importRecord.import_id, product.productId, product.batch, product.quantity, product.price, product.quantity * product.price, product.mfgDate, product.expDate]
      );
    }
    
    // Update distribution status if linked
    if (distributionId) {
      await client.query(
        `UPDATE distributions 
         SET status = 'delivered', updated_at = NOW()
         WHERE id = $1`,
        [distributionId]
      );
    }
    
    await client.query('COMMIT');
    
    // Emit socket event to agency
    const io = req.app.get('io');
    if (io) {
      emitToRole(io, 'agency', EVENTS.IMPORT_CREATED, {
        id: importRecord.id,
        code: importRecord.code,
        totalAmount: totalAmount,
        message: 'Có phiếu nhập hàng mới'
      });
    }
    
    res.status(201).json({
      success: true,
      data: importRecord,
      message: 'Tạo phiếu nhập hàng thành công'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating import:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi tạo phiếu nhập hàng'
    });
  } finally {
    client.release();
  }
};

// Confirm receipt (agency confirms they received goods)
const confirmReceipt = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { role, agencyId } = req.user;
    
    // Get import
    let checkQuery = 'SELECT * FROM imports WHERE id = $1';
    const checkParams = [id];
    
    if (role === 'agency') {
      checkQuery += ' AND agency_id = $2';
      checkParams.push(agencyId);
    }
    
    const importResult = await client.query(checkQuery, checkParams);
    
    if (importResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phiếu nhập hàng'
      });
    }
    
    const importRecord = importResult.rows[0];
    
    if (importRecord.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Phiếu nhập hàng này đã được xử lý'
      });
    }
    
    // Update import status
    await client.query(
      `UPDATE imports 
       SET status = 'received', receive_date = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [id]
    );
    
    // Update agency debt (add debt when received)
    await client.query(
      `UPDATE agencies 
       SET current_debt = current_debt + $1, updated_at = NOW()
       WHERE id = $2`,
      [importRecord.total_amount, importRecord.agency_id]
    );
    
    const result = await client.query(
      'SELECT * FROM imports WHERE id = $1',
      [id]
    );
    
    // Get updated agency debt
    const agencyResult = await client.query(
      'SELECT current_debt FROM agencies WHERE id = $1',
      [importRecord.agency_id]
    );
    const newDebt = agencyResult.rows[0].current_debt;
    
    await client.query('COMMIT');
    
    // Emit socket events
    const io = req.app.get('io');
    if (io) {
      // Notify staff about receipt confirmation
      emitToRole(io, 'staff', EVENTS.IMPORT_CONFIRMED, {
        id: result.rows[0].id,
        code: result.rows[0].code,
        message: 'Đại lý đã xác nhận nhận hàng'
      });
      // Notify agency about debt change
      emitToRole(io, 'agency', EVENTS.AGENCY_DEBT_CHANGED, {
        agencyId: importRecord.agency_id,
        newDebt: newDebt,
        message: `Công nợ mới: ${newDebt.toLocaleString('vi-VN')} VND`
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Xác nhận nhận hàng thành công'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error confirming receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xác nhận nhận hàng'
    });
  } finally {
    client.release();
  }
};

// Cancel import
const cancelImport = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.user;
    
    // Only staff and admin can cancel
    if (role === 'agency') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện thao tác này'
      });
    }
    
    const checkResult = await pool.query(
      'SELECT * FROM imports WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phiếu nhập hàng'
      });
    }
    
    const importRecord = checkResult.rows[0];
    
    if (importRecord.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể hủy phiếu nhập hàng đang chờ xử lý'
      });
    }
    
    const result = await pool.query(
      `UPDATE imports 
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Hủy phiếu nhập hàng thành công'
    });
  } catch (error) {
    console.error('Error cancelling import:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi hủy phiếu nhập hàng'
    });
  }
};

module.exports = {
  getAllImports,
  getImportById,
  createImport,
  confirmReceipt,
  cancelImport
};

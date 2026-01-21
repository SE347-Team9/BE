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
    
    // Query to get all imports with details
    query = `
      SELECT 
        i.import_id as id,
        i.import_code as code,
        i.supplier_id,
        s.name as supplier_name,
        i.import_date,
        i.total_amount,
        i.notes,
        i.created_by,
        i.status,
        i.created_at,
        i.updated_at,
        json_agg(json_build_object(
          'product_id', id.product_id,
          'product_name', p.name,
          'product_code', p.code,
          'batch', id.batch_code,
          'mfg_date', id.manufacturing_date,
          'exp_date', id.expiry_date,
          'quantity', id.quantity,
          'unit', p.unit,
          'price', id.unit_price,
          'subtotal', id.total_price
        )) as products
      FROM warehouse.import i
      LEFT JOIN warehouse.import_detail id ON i.import_id = id.import_id
      LEFT JOIN master.product p ON id.product_id = p.product_id
      LEFT JOIN master.supplier s ON i.supplier_id = s.supplier_id
      GROUP BY i.import_id, i.import_code, i.supplier_id, s.name, i.import_date, i.total_amount, i.notes, i.created_by, i.status, i.created_at, i.updated_at
      ORDER BY i.created_at DESC
    `;
    
    const result = await pool.query(query, params);
    
    console.log('getAllImports result rows:', result.rows.length);
    if (result.rows.length > 0) {
      console.log('First import:', JSON.stringify(result.rows[0], null, 2));
    }
    
    res.json({
      success: true,
      message: 'Lấy danh sách nhập hàng thành công',
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
      SELECT 
        i.import_id as id,
        i.import_code as code,
        i.supplier_id,
        i.import_date,
        i.total_amount,
        i.notes,
        i.created_by,
        i.status,
        i.created_at,
        i.updated_at,
        json_agg(json_build_object(
          'product_id', id.product_id,
          'product_name', p.name,
          'product_code', p.code,
          'batch', id.batch_code,
          'mfg_date', id.manufacturing_date,
          'exp_date', id.expiry_date,
          'quantity', id.quantity,
          'unit', p.unit,
          'price', id.unit_price,
          'subtotal', id.total_price
        )) as products
      FROM warehouse.import i
      LEFT JOIN warehouse.import_detail id ON i.import_id = id.import_id
      LEFT JOIN master.product p ON id.product_id = p.product_id
      WHERE i.import_id = $1
      GROUP BY i.import_id, i.import_code, i.supplier_id, i.import_date, i.total_amount, i.notes, i.created_by, i.status, i.created_at, i.updated_at
    `;
    
    const params = [id];
    
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
    
    const { distributionId, shipDate, receiveDate, products, notes, supplierId } = req.body;
    const { id: userId, role } = req.user;
    
    // Only staff and admin can create imports
    if (role === 'agency') {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện thao tác này'
      });
    }
    
    // Validate
    if (!products || products.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn ít nhất một sản phẩm'
      });
    }
    
    // Calculate total amount from products
    let totalAmount = 0;
    for (const product of products) {
      totalAmount += (product.price || 0) * (product.quantity || 0);
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
       RETURNING import_id, import_code, supplier_id, import_date, total_amount, notes, created_by, status, created_at, updated_at`,
      [code, supplierId || null, shipDate || new Date(), totalAmount, notes || null, userId, 'pending']
    );
    
    if (insertResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi tạo phiếu nhập hàng'
      });
    }
    
    const importRecord = insertResult.rows[0];
    
    // Insert import products
    for (const product of products) {
      const productId = product.productId || product.product_id;
      
      if (!productId) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Sản phẩm ${product.name || 'không xác định'} không có ID hợp lệ`
        });
      }
      
      if (!product.quantity || product.quantity <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Số lượng sản phẩm ${product.name || 'không xác định'} không hợp lệ`
        });
      }
      
      if (product.price === undefined || product.price === null || product.price < 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Giá sản phẩm ${product.name || 'không xác định'} không hợp lệ`
        });
      }
      
      await client.query(
        `INSERT INTO warehouse.import_detail (import_id, product_id, batch_code, quantity, unit_price, total_price, manufacturing_date, expiry_date, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          importRecord.import_id, 
          productId, 
          product.batch || product.batch_code || null, 
          product.quantity, 
          product.price || product.unit_price || 0, 
          (product.price || product.unit_price || 0) * product.quantity, 
          product.mfgDate || product.manufacturing_date || null, 
          product.expDate || product.expiry_date || null
        ]
      );
    }
    
    // Update distribution status if linked
    if (distributionId) {
      await client.query(
        `UPDATE ordermgmt.distribution 
         SET status = 'delivered', updated_at = NOW()
         WHERE distribution_id = $1`,
        [distributionId]
      );
    }
    
    await client.query('COMMIT');
    
    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      // Gửi thông báo cho admin về yêu cầu nhập hàng mới
      emitToRole(io, 'admin', EVENTS.IMPORT_CREATED, {
        id: importRecord.import_id,
        code: importRecord.import_code,
        supplier_id: importRecord.supplier_id,
        totalAmount: totalAmount,
        message: 'Yêu cầu nhập hàng mới từ staff'
      });
    }
    
    const responseData = {
      success: true,
      message: 'Tạo phiếu nhập hàng thành công',
      data: {
        import_id: importRecord.import_id,
        import_code: importRecord.import_code,
        supplier_id: importRecord.supplier_id,
        import_date: importRecord.import_date,
        total_amount: importRecord.total_amount,
        notes: importRecord.notes,
        created_by: importRecord.created_by,
        status: importRecord.status,
        created_at: importRecord.created_at
      }
    };
    
    console.log('Sending response:', JSON.stringify(responseData));
    res.status(201).json(responseData);
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

// Confirm receipt (staff/admin confirms import completion)
const confirmReceipt = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { role } = req.user;
    
    // Only staff and admin can confirm
    if (role === 'agency') {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện thao tác này'
      });
    }
    
    // Get import
    const importResult = await client.query(
      'SELECT * FROM warehouse.import WHERE import_id = $1',
      [id]
    );
    
    if (importResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phiếu nhập hàng'
      });
    }
    
    const importRecord = importResult.rows[0];
    
    // Update import status
    const result = await client.query(
      `UPDATE warehouse.import 
       SET status = 'completed', updated_at = NOW()
       WHERE import_id = $1
       RETURNING *`,
      [id]
    );
    
    await client.query('COMMIT');
    
    // Emit socket events
    const io = req.app.get('io');
    if (io) {
      emitToRole(io, 'staff', EVENTS.IMPORT_CONFIRMED, {
        id: result.rows[0].import_id,
        code: result.rows[0].import_code,
        message: 'Phiếu nhập hàng đã được xác nhận'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Xác nhận nhập hàng thành công'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error confirming receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xác nhận nhập hàng'
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
      'SELECT * FROM warehouse.import WHERE import_id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phiếu nhập hàng'
      });
    }
    
    const importRecord = checkResult.rows[0];
    
    if (importRecord.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Phiếu nhập hàng này đã bị hủy'
      });
    }
    
    const result = await pool.query(
      `UPDATE warehouse.import 
       SET status = 'cancelled', updated_at = NOW()
       WHERE import_id = $1
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

// Get pending imports for admin approval
const getPendingImports = async (req, res) => {
  try {
    const query = `
      SELECT 
        i.import_id as id,
        i.import_code as code,
        i.supplier_id,
        s.name as supplier_name,
        i.import_date,
        i.total_amount,
        i.notes,
        i.created_by,
        i.status,
        i.created_at,
        i.updated_at,
        json_agg(json_build_object(
          'product_id', id.product_id,
          'product_name', p.name,
          'product_code', p.code,
          'batch', id.batch_code,
          'mfg_date', id.manufacturing_date,
          'exp_date', id.expiry_date,
          'quantity', id.quantity,
          'unit', p.unit,
          'price', id.unit_price,
          'subtotal', id.total_price
        )) as products
      FROM warehouse.import i
      LEFT JOIN warehouse.import_detail id ON i.import_id = id.import_id
      LEFT JOIN master.product p ON id.product_id = p.product_id
      LEFT JOIN master.supplier s ON i.supplier_id = s.supplier_id
      WHERE i.status = 'pending'
      GROUP BY i.import_id, i.import_code, i.supplier_id, s.name, i.import_date, i.total_amount, i.notes, i.created_by, i.status, i.created_at, i.updated_at
      ORDER BY i.created_at DESC
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      message: 'Lấy danh sách phiếu nhập chờ duyệt thành công',
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching pending imports:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải danh sách phiếu nhập chờ duyệt'
    });
  }
};

// Approve import (admin approves import request)
const approveImport = async (req, res) => {
  try {
    const { id } = req.params;
    const { approved } = req.body;
    
    const newStatus = approved ? 'completed' : 'rejected';
    
    const result = await pool.query(
      `UPDATE warehouse.import 
       SET status = $1, updated_at = NOW()
       WHERE import_id = $2
       RETURNING *`,
      [newStatus, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phiếu nhập hàng'
      });
    }
    
    const statusText = approved ? 'Đã duyệt' : 'Đã từ chối';
    
    res.json({
      success: true,
      message: `${statusText} phiếu nhập hàng thành công`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error approving import:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi duyệt phiếu nhập hàng'
    });
  }
};

module.exports = {
  getAllImports,
  getImportById,
  createImport,
  confirmReceipt,
  cancelImport,
  getPendingImports,
  approveImport
};

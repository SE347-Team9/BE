const pool = require('../config/database');
const { emitToRole, EVENTS } = require('../utils/socket');

/**
 * Distribution Controller
 * Handles distribution requests from agencies
 */

// Get all distributions (filtered by role)
const getAllDistributions = async (req, res) => {
  try {
    const { role, agencyId, userId } = req.user;
    
    let query;
    let params = [];
    
    if (role === 'agency') {
      // Agency can only see their own distributions
      query = `
        SELECT d.distribution_id, d.distribution_code, d.agency_id, d.order_date, d.delivery_date,
               d.total_amount, d.status, d.notes, d.created_by, d.created_at, d.updated_at,
               a.name as agency_name, a.code as agency_code,
               acc.username as created_by_name,
               json_agg(json_build_object(
                 'product_id', dp.product_id,
                 'product_name', p.name,
                 'product_code', p.code,
                 'quantity', dp.quantity,
                 'unit', p.unit,
                 'price', dp.unit_price,
                 'subtotal', dp.quantity * dp.unit_price
               ) ORDER BY dp.distribution_detail_id) FILTER (WHERE dp.distribution_detail_id IS NOT NULL) as products
        FROM ordermgmt.distribution d
        LEFT JOIN master.agency a ON d.agency_id = a.agency_id
        LEFT JOIN auth.account acc ON d.created_by = acc.account_id
        LEFT JOIN ordermgmt.distribution_detail dp ON d.distribution_id = dp.distribution_id
        LEFT JOIN master.product p ON dp.product_id = p.product_id
        WHERE d.agency_id = $1
        GROUP BY d.distribution_id, a.name, a.code, acc.username
        ORDER BY d.created_at DESC
      `;
      params = [agencyId];
    } else if (role === 'staff') {
      // Staff can see distributions from agencies they manage
      // For now, allow staff to see all distributions for testing
      query = `
        SELECT d.distribution_id, d.distribution_code, d.agency_id, d.order_date, d.delivery_date,
               d.total_amount, d.status, d.notes, d.created_by, d.created_at, d.updated_at,
               a.name as agency_name, a.code as agency_code,
               acc.username as created_by_name,
               json_agg(json_build_object(
                 'product_id', dp.product_id,
                 'product_name', p.name,
                 'product_code', p.code,
                 'quantity', dp.quantity,
                 'unit', p.unit,
                 'price', dp.unit_price,
                 'subtotal', dp.quantity * dp.unit_price
               ) ORDER BY dp.distribution_detail_id) FILTER (WHERE dp.distribution_detail_id IS NOT NULL) as products
        FROM ordermgmt.distribution d
        LEFT JOIN master.agency a ON d.agency_id = a.agency_id
        LEFT JOIN auth.account acc ON d.created_by = acc.account_id
        LEFT JOIN ordermgmt.distribution_detail dp ON d.distribution_id = dp.distribution_id
        LEFT JOIN master.product p ON dp.product_id = p.product_id
        GROUP BY d.distribution_id, a.name, a.code, acc.username
        ORDER BY d.created_at DESC
      `;
      params = [];
    } else {
      // Admin can see all distributions
      query = `
        SELECT d.distribution_id, d.distribution_code, d.agency_id, d.order_date, d.delivery_date,
               d.total_amount, d.status, d.notes, d.created_by, d.created_at, d.updated_at,
               a.name as agency_name, a.code as agency_code,
               acc.username as created_by_name,
               json_agg(json_build_object(
                 'product_id', dp.product_id,
                 'product_name', p.name,
                 'product_code', p.code,
                 'quantity', dp.quantity,
                 'unit', p.unit,
                 'price', dp.unit_price,
                 'subtotal', dp.quantity * dp.unit_price
               ) ORDER BY dp.distribution_detail_id) FILTER (WHERE dp.distribution_detail_id IS NOT NULL) as products
        FROM ordermgmt.distribution d
        LEFT JOIN master.agency a ON d.agency_id = a.agency_id
        LEFT JOIN auth.account acc ON d.created_by = acc.account_id
        LEFT JOIN ordermgmt.distribution_detail dp ON d.distribution_id = dp.distribution_id
        LEFT JOIN master.product p ON dp.product_id = p.product_id
        GROUP BY d.distribution_id, a.name, a.code, acc.username
        ORDER BY d.created_at DESC
      `;
    }
    
    const result = await pool.query(query, params);
    
    console.log('[getAllDistributions] Role:', role);
    console.log('[getAllDistributions] Query params:', params);
    console.log('[getAllDistributions] Result count:', result.rows.length);
    console.log('[getAllDistributions] First few rows:', JSON.stringify(result.rows.slice(0, 2), null, 2));
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching distributions:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải danh sách phân phối'
    });
  }
};

// Get distribution by ID
const getDistributionById = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, agencyId } = req.user;

    let query = `
      SELECT d.distribution_id, d.distribution_code, d.agency_id, d.order_date, d.delivery_date,
             d.total_amount, d.status, d.notes, d.created_by, d.created_at, d.updated_at,
             a.name as agency_name, a.code as agency_code, a.address as agency_address, a.phone as agency_phone,
             acc.username as created_by_name,
             json_agg(json_build_object(
               'product_id', dp.product_id,
               'product_name', p.name,
               'product_code', p.code,
               'quantity', dp.quantity,
               'unit', p.unit,
               'price', dp.unit_price,
               'subtotal', dp.quantity * dp.unit_price
             ) ORDER BY dp.distribution_detail_id) FILTER (WHERE dp.distribution_detail_id IS NOT NULL) as products
      FROM ordermgmt.distribution d
      LEFT JOIN master.agency a ON d.agency_id = a.agency_id
      LEFT JOIN auth.account acc ON d.created_by = acc.account_id
      LEFT JOIN ordermgmt.distribution_detail dp ON d.distribution_id = dp.distribution_id
      LEFT JOIN master.product p ON dp.product_id = p.product_id
      WHERE d.distribution_id = $1
    `;

    const params = [id];

    // Agency can only view their own distributions
    if (role === 'agency') {
      query += ' AND d.agency_id = $2';
      params.push(agencyId);
    }

    query += ' GROUP BY d.distribution_id, a.name, a.code, a.address, a.phone, acc.username';

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phiếu phân phối'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching distribution:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải thông tin phân phối'
    });
  }
};

// Create new distribution
const createDistribution = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { products, deliveryAddress, notes } = req.body;
    const { userId, role, agencyId, accountId } = req.user;
    
    // Use accountId if available, otherwise use userId (for backward compatibility)
    const createdBy = accountId || userId;
    
    // Validate
    if (!products || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn ít nhất một sản phẩm'
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
    
    // Generate distribution code - use DH prefix (Distribution/Đơn Hàng)
    const codeResult = await client.query(
      "SELECT COALESCE(MAX(CAST(SUBSTRING(distribution_code FROM 3) AS INTEGER)), 0) + 1 as next_num FROM ordermgmt.distribution WHERE distribution_code ~ '^DH[0-9]+$'"
    );
    const nextNum = codeResult.rows[0].next_num;
    const code = `DH${String(nextNum).padStart(3, '0')}`;
    
    // Calculate total amount using selling_price
    let totalAmount = 0;
    for (const product of products) {
      const priceResult = await client.query(
        'SELECT selling_price FROM master.product WHERE product_id = $1',
        [product.productId]
      );
      if (priceResult.rows.length === 0) {
        throw new Error(`Sản phẩm ID ${product.productId} không tồn tại`);
      }
      const price = priceResult.rows[0].selling_price;
      totalAmount += price * product.quantity;
    }
    
    // Check agency debt and credit limit
    if (role === 'agency') {
      const agencyResult = await client.query(
        'SELECT current_debt, debt_limit FROM master.agency WHERE agency_id = $1',
        [targetAgencyId]
      );
      
      if (agencyResult.rows.length > 0) {
        const { current_debt, debt_limit } = agencyResult.rows[0];
        const newDebt = (current_debt || 0) + totalAmount;
        
        if (newDebt > debt_limit) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            message: `Vượt quá hạn mức công nợ. Hạn mức: ${debt_limit.toLocaleString('vi-VN')} VND, Công nợ hiện tại: ${current_debt.toLocaleString('vi-VN')} VND`
          });
        }
      }
    }
    
    // Get agency address for delivery_address if not provided
    let finalDeliveryAddress = deliveryAddress;
    if (!finalDeliveryAddress) {
      const agencyAddressResult = await client.query(
        'SELECT address FROM master.agency WHERE agency_id = $1',
        [targetAgencyId]
      );
      if (agencyAddressResult.rows.length > 0) {
        finalDeliveryAddress = agencyAddressResult.rows[0].address;
      }
    }
    
    // Insert distribution
    const insertResult = await client.query(
      `INSERT INTO ordermgmt.distribution (distribution_code, agency_id, order_date, delivery_date, total_amount, status, notes, created_by, created_at, updated_at)
       VALUES ($1, $2, CURRENT_DATE, NULL, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [code, targetAgencyId, totalAmount, 'pending', notes || '', createdBy]
    );
    
    const distribution = insertResult.rows[0];
    
    // Insert distribution details
    for (const product of products) {
      const priceResult = await client.query(
        'SELECT selling_price FROM master.product WHERE product_id = $1',
        [product.productId]
      );
      const price = priceResult.rows[0].selling_price;
      
      await client.query(
        `INSERT INTO ordermgmt.distribution_detail (distribution_id, product_id, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [distribution.distribution_id, product.productId, product.quantity, price, price * product.quantity]
      );
    }
    
    await client.query('COMMIT');
    
    // Emit socket event to staff
    const io = req.app.get('io');
    if (io) {
      emitToRole(io, 'staff', EVENTS.DISTRIBUTION_CREATED, {
        id: distribution.id,
        code: distribution.code,
        totalAmount: totalAmount,
        message: 'Có yêu cầu phân phối mới'
      });
    }
    
    res.status(201).json({
      success: true,
      data: distribution,
      message: 'Tạo phiếu phân phối thành công'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating distribution:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi tạo phiếu phân phối'
    });
  } finally {
    client.release();
  }
};

// Update distribution status (staff/admin)
const updateDistributionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { role } = req.user;
    
    // Only staff and admin can update status
    if (role === 'agency') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện thao tác này'
      });
    }
    
    const validStatuses = ['pending', 'approved', 'processing', 'shipping', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái không hợp lệ'
      });
    }
    
    const result = await pool.query(
      `UPDATE ordermgmt.distribution 
       SET status = $1, updated_at = NOW()
       WHERE distribution_id = $2
       RETURNING *`,
      [status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phiếu phân phối'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Cập nhật trạng thái thành công'
    });
  } catch (error) {
    console.error('Error updating distribution status:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật trạng thái'
    });
  }
};

// Cancel distribution
const cancelDistribution = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, agencyId } = req.user;
    
    // Check if distribution exists and belongs to agency
    let checkQuery = 'SELECT * FROM distributions WHERE id = $1';
    const checkParams = [id];
    
    if (role === 'agency') {
      checkQuery += ' AND agency_id = $2';
      checkParams.push(agencyId);
    }
    
    const checkResult = await pool.query(checkQuery, checkParams);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phiếu phân phối'
      });
    }
    
    const distribution = checkResult.rows[0];
    
    // Can only cancel pending distributions
    if (distribution.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể hủy phiếu phân phối đang chờ duyệt'
      });
    }
    
    const result = await pool.query(
      `UPDATE distributions 
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    
    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      emitToRole(io, 'staff', EVENTS.DISTRIBUTION_CANCELLED, {
        id: result.rows[0].id,
        code: result.rows[0].code,
        message: 'Phiếu phân phối đã bị hủy'
      });
      emitToRole(io, 'agency', EVENTS.DISTRIBUTION_CANCELLED, {
        id: result.rows[0].id,
        code: result.rows[0].code,
        message: 'Phiếu phân phối đã bị hủy'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Hủy phiếu phân phối thành công'
    });
  } catch (error) {
    console.error('Error cancelling distribution:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi hủy phiếu phân phối'
    });
  }
};

// Approve distribution (staff/admin only)
const approveDistribution = async (req, res) => {
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
    
    // Get distribution
    const distResult = await client.query(
      'SELECT * FROM distributions WHERE id = $1',
      [id]
    );
    
    if (distResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phiếu phân phối'
      });
    }
    
    const distribution = distResult.rows[0];
    
    if (distribution.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể duyệt phiếu phân phối đang chờ'
      });
    }
    
    // Check product stock
    const productsResult = await client.query(
      'SELECT * FROM distribution_products WHERE distribution_id = $1',
      [id]
    );
    
    for (const item of productsResult.rows) {
      const stockResult = await client.query(
        'SELECT stock_quantity FROM products WHERE id = $1',
        [item.product_id]
      );
      
      if (stockResult.rows.length === 0 || stockResult.rows[0].stock_quantity < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Không đủ tồn kho cho sản phẩm ID ${item.product_id}`
        });
      }
      
      // Deduct stock
      await client.query(
        'UPDATE products SET stock_quantity = stock_quantity - $1, updated_at = NOW() WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }
    
    // Update distribution status
    const result = await client.query(
      `UPDATE distributions 
       SET status = 'approved', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    
    await client.query('COMMIT');
    
    // Emit socket event to agency
    const io = req.app.get('io');
    if (io) {
      emitToRole(io, 'agency', EVENTS.DISTRIBUTION_APPROVED, {
        id: result.rows[0].id,
        code: result.rows[0].code,
        message: 'Phiếu phân phối đã được duyệt'
      });
      // Also emit to staff for list refresh
      emitToRole(io, 'staff', EVENTS.DISTRIBUTION_APPROVED, {
        id: result.rows[0].id,
        code: result.rows[0].code,
        message: 'Phiếu phân phối đã được duyệt'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Duyệt phiếu phân phối thành công'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error approving distribution:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi duyệt phiếu phân phối'
    });
  } finally {
    client.release();
  }
};

module.exports = {
  getAllDistributions,
  getDistributionById,
  createDistribution,
  updateDistributionStatus,
  cancelDistribution,
  approveDistribution
};

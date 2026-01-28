const pool = require('../config/database');
const { emitToRole, EVENTS } = require('../utils/socket');

/**
 * Receive Order Controller
 * Handles receive order operations for staff
 */

// Get all receive orders
const getAllReceiveOrders = async (req, res) => {
  try {
    const { role, agencyId } = req.user;
    
    let query;
    let params = [];
    
    // Query to get all receive orders with details
    query = `
      SELECT 
        ro.receive_order_id as id,
        ro.receive_code as code,
        ro.supplier_id,
        s.name as supplier_name,
        ro.receive_date as date,
        ro.total_amount,
        ro.notes,
        ro.created_by,
        ro.status,
        ro.created_at,
        ro.updated_at,
        json_agg(json_build_object(
          'product_id', rod.product_id,
          'product_name', p.name,
          'product_code', p.code,
          'batch', rod.batch_code,
          'mfg_date', rod.manufacturing_date,
          'exp_date', rod.expiry_date,
          'quantity', rod.quantity,
          'unit', p.unit,
          'price', rod.unit_price,
          'subtotal', rod.total_price,
          'warehouse', rod.warehouse
        )) as products
      FROM warehouse.receive_order ro
      LEFT JOIN warehouse.receive_order_detail rod ON ro.receive_order_id = rod.receive_order_id
      LEFT JOIN master.product p ON rod.product_id = p.product_id
      LEFT JOIN master.supplier s ON ro.supplier_id = s.supplier_id
      GROUP BY ro.receive_order_id, ro.receive_code, ro.supplier_id, s.name, ro.receive_date, ro.total_amount, ro.notes, ro.created_by, ro.status, ro.created_at, ro.updated_at
      ORDER BY ro.created_at DESC
    `;
    
    const result = await pool.query(query, params);
    
    console.log('getAllReceiveOrders result rows:', result.rows.length);
    if (result.rows.length > 0) {
      console.log('First receive order:', JSON.stringify(result.rows[0], null, 2));
    }
    
    res.json({
      success: true,
      message: 'Lấy danh sách phiếu nhận thành công',
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching receive orders:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải danh sách phiếu nhận'
    });
  }
};

// Get receive order by ID
const getReceiveOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    
    let query = `
      SELECT 
        ro.receive_order_id as id,
        ro.receive_code as code,
        ro.supplier_id,
        s.name as supplier_name,
        ro.receive_date as date,
        ro.total_amount,
        ro.notes,
        ro.created_by,
        ro.status,
        ro.created_at,
        ro.updated_at,
        json_agg(json_build_object(
          'product_id', rod.product_id,
          'product_name', p.name,
          'product_code', p.code,
          'batch', rod.batch_code,
          'mfg_date', rod.manufacturing_date,
          'exp_date', rod.expiry_date,
          'quantity', rod.quantity,
          'unit', p.unit,
          'price', rod.unit_price,
          'subtotal', rod.total_price,
          'warehouse', rod.warehouse
        )) as products
      FROM warehouse.receive_order ro
      LEFT JOIN warehouse.receive_order_detail rod ON ro.receive_order_id = rod.receive_order_id
      LEFT JOIN master.product p ON rod.product_id = p.product_id
      LEFT JOIN master.supplier s ON ro.supplier_id = s.supplier_id
      WHERE ro.receive_order_id = $1
      GROUP BY ro.receive_order_id, ro.receive_code, ro.supplier_id, s.name, ro.receive_date, ro.total_amount, ro.notes, ro.created_by, ro.status, ro.created_at, ro.updated_at
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Phiếu nhận không tìm thấy'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching receive order:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải thông tin phiếu nhận'
    });
  }
};

// Create new receive order (staff only)
const createReceiveOrder = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { supplierId, items, total } = req.body;
    const { id: userId, role } = req.user;
    
    // Only staff can create receive orders
    if (role === 'agency') {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện thao tác này'
      });
    }
    
    // Validate
    if (!supplierId) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn nhà cung cấp'
      });
    }
    
    if (!items || items.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn ít nhất một sản phẩm'
      });
    }
    
    // Validate items
    for (const item of items) {
      if (!item.productId) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Sản phẩm ${item.productName || 'không xác định'} không có ID hợp lệ`
        });
      }
      
      if (!item.quantity || item.quantity <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Số lượng sản phẩm ${item.productName || 'không xác định'} không hợp lệ`
        });
      }
      
      if (item.price === undefined || item.price === null || item.price < 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Giá sản phẩm ${item.productName || 'không xác định'} không hợp lệ`
        });
      }
    }
    
    // Calculate total amount from items
    let totalAmount = 0;
    for (const item of items) {
      totalAmount += (item.price || 0) * (item.quantity || 0);
    }
    
    // Generate receive order code
    const codeResult = await client.query(
      'SELECT COUNT(*) as count FROM warehouse.receive_order'
    );
    const count = parseInt(codeResult.rows[0].count) + 1;
    const code = `PN_NHN${String(count).padStart(5, '0')}`;
    
    // Insert receive order
    const insertResult = await client.query(
      `INSERT INTO warehouse.receive_order (receive_code, supplier_id, receive_date, total_amount, created_by, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING receive_order_id, receive_code, supplier_id, receive_date, total_amount, created_by, status, created_at, updated_at`,
      [code, supplierId, new Date().toISOString().split('T')[0], totalAmount, userId, 'pending']
    );
    
    if (insertResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi tạo phiếu nhận hàng'
      });
    }
    
    const receiveOrder = insertResult.rows[0];
    
    // Insert receive order items and update inventory
    for (const item of items) {
      // Insert receive order detail
      await client.query(
        `INSERT INTO warehouse.receive_order_detail (receive_order_id, product_id, batch_code, quantity, unit_price, total_price, manufacturing_date, expiry_date, warehouse, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [
          receiveOrder.receive_order_id, 
          item.productId, 
          item.batch || null, 
          item.quantity, 
          item.price, 
          item.price * item.quantity, 
          item.mfgDate || null, 
          item.expDate || null,
          item.warehouse || 'Kho thường'
        ]
      );
      
      // Update inventory_product (tồn kho)
      // Note: inventory_product has warehouse_id and product_id, quantity (not total_quantity)
      const checkInventoryResult = await client.query(
        `SELECT inventory_product_id, quantity 
         FROM master.inventory_product 
         WHERE product_id = $1`,
        [item.productId]
      );
      
      let inventoryProductId;
      
      if (checkInventoryResult.rows.length > 0) {
        inventoryProductId = checkInventoryResult.rows[0].inventory_product_id;
        const oldQuantity = checkInventoryResult.rows[0].quantity;
       
        // UPDATE: Add the received quantity
        await client.query(
          `UPDATE master.inventory_product 
           SET quantity = quantity + $1,
               last_updated = NOW()
           WHERE inventory_product_id = $2`,
          [item.quantity, inventoryProductId]
        );
       
         // Get updated quantity
         const updatedResult = await client.query(
           `SELECT quantity FROM master.inventory_product WHERE inventory_product_id = $1`,
           [inventoryProductId]
        );
        const newQuantity = parseInt(updatedResult.rows[0].quantity) || 0;
       
        console.log(`[INVENTORY UPDATE] Product ${item.productId}: ${oldQuantity} + ${item.quantity} = ${newQuantity}`);
      } else {
        // No inventory exists - this shouldn't happen in real system
        inventoryProductId = null;
        console.warn(`[WARNING] No inventory record found for product ${item.productId}`);
      }
      
      // Mỗi dòng sản phẩm = 1 lô mới, luôn tạo batch mới (không gộp)
      if (inventoryProductId) {
        // Generate batch code if not provided
        let batchCode = item.batch;
        if (!batchCode) {
          const batchCountResult = await client.query(
            'SELECT COUNT(*) as count FROM master.inventory_batch'
          );
          const batchCount = parseInt(batchCountResult.rows[0].count) + 1;
          batchCode = `LO${String(item.productId).padStart(4, '0')}_${String(batchCount).padStart(3, '0')}`;
        }

        // Determine status based on expiry date
        let batchStatus = 'normal';
        if (item.expDate) {
          const expDate = new Date(item.expDate);
          const today = new Date();
          const daysUntilExpiry = Math.floor((expDate - today) / (1000 * 60 * 60 * 24));

          if (daysUntilExpiry < 0) {
            batchStatus = 'expired';
          } else if (daysUntilExpiry <= 30) {
            batchStatus = 'near_expiry';
          }
        }

        await client.query(
          `INSERT INTO master.inventory_batch (
            inventory_product_id, batch_code, quantity, 
            expiry_date, import_date, status, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [
            inventoryProductId,
            batchCode,
            item.quantity,
            item.expDate || null,
            item.mfgDate || null,
            batchStatus
          ]
        );
      }
    }
    // VERIFICATION: Check if inventory quantities match batch totals
    const productsSet = new Set(items.map(item => item.productId));
    for (const productId of productsSet) {
      const invResult = await client.query(
        `SELECT inventory_product_id, quantity FROM master.inventory_product WHERE product_id = $1 LIMIT 1`,
        [productId]
      );

      if (invResult.rows.length > 0) {
        const invProductId = invResult.rows[0].inventory_product_id;

        // Tính tổng quantity từ batch để đồng bộ inventory
        const batchResult = await client.query(
          `SELECT COALESCE(SUM(quantity), 0) as total FROM master.inventory_batch WHERE inventory_product_id = $1`,
          [invProductId]
        );

        const batchTotal = parseInt(batchResult.rows[0].total) || 0;

        // Cập nhật lại inventory theo tổng batch để tránh lệch
        await client.query(
          `UPDATE master.inventory_product SET quantity = $1, last_updated = NOW() WHERE inventory_product_id = $2`,
          [batchTotal, invProductId]
        );

        if (batchTotal === 0) {
          console.warn(`[SYNC] Product ${productId}: no batches found, inventory set to 0`);
        } else {
          console.log(`[SYNC] Product ${productId}: inventory set to batch total ${batchTotal}`);
        }
      }
    }

    await client.query('COMMIT');
    
    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      emitToRole(io, 'staff', EVENTS.RECEIVE_ORDER_CREATED, {
        receiveOrderId: receiveOrder.receive_order_id,
        receiveCode: receiveOrder.receive_code,
        timestamp: new Date()
      });
    }
    
    res.status(201).json({
      success: true,
      message: 'Tạo phiếu nhận hàng thành công',
      data: receiveOrder
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating receive order:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo phiếu nhận hàng'
    });
  } finally {
    client.release();
  }
};

// Update receive order status
const updateReceiveOrderStatus = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { status } = req.body;
    const { id: userId, role } = req.user;
    
    // Only staff can update
    if (role === 'agency') {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện thao tác này'
      });
    }
    
    // Validate status
    const validStatuses = ['pending', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Trạng thái không hợp lệ'
      });
    }
    
    // Update status
    const updateResult = await client.query(
      `UPDATE warehouse.receive_order 
       SET status = $1, updated_at = NOW()
       WHERE receive_order_id = $2
       RETURNING *`,
      [status, id]
    );
    
    if (updateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Phiếu nhận không tìm thấy'
      });
    }
    
    // If completing, add inventory
    if (status === 'completed') {
      const detailsResult = await client.query(
        `SELECT product_id, quantity FROM warehouse.receive_order_detail WHERE receive_order_id = $1`,
        [id]
      );
      
      for (const detail of detailsResult.rows) {
        // Update or insert inventory
        await client.query(
          `INSERT INTO master.inventory_product (product_id, total_quantity, available_quantity, last_updated)
           VALUES ($1, $2, $2, NOW())
           ON CONFLICT (product_id) DO UPDATE
           SET total_quantity = master.inventory_product.total_quantity + $2,
               available_quantity = master.inventory_product.available_quantity + $2,
               last_updated = NOW()`,
          [detail.product_id, detail.quantity]
        );
      }
    }
    
    await client.query('COMMIT');
    
    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      emitToRole(io, 'staff', EVENTS.RECEIVE_ORDER_UPDATED, {
        receiveOrderId: id,
        status,
        timestamp: new Date()
      });
    }
    
    res.json({
      success: true,
      message: 'Cập nhật trạng thái phiếu nhận thành công',
      data: updateResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating receive order status:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật trạng thái phiếu nhận'
    });
  } finally {
    client.release();
  }
};

// Delete receive order
const deleteReceiveOrder = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { role } = req.user;
    
    // Only staff can delete
    if (role === 'agency') {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện thao tác này'
      });
    }
    
    // Check if exists
    const checkResult = await client.query(
      `SELECT * FROM warehouse.receive_order WHERE receive_order_id = $1`,
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Phiếu nhận không tìm thấy'
      });
    }
    
    // Delete details first (cascade)
    await client.query(
      `DELETE FROM warehouse.receive_order_detail WHERE receive_order_id = $1`,
      [id]
    );
    
    // Delete order
    await client.query(
      `DELETE FROM warehouse.receive_order WHERE receive_order_id = $1`,
      [id]
    );
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Xóa phiếu nhận thành công'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting receive order:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa phiếu nhận'
    });
  } finally {
    client.release();
  }
};

module.exports = {
  getAllReceiveOrders,
  getReceiveOrderById,
  createReceiveOrder,
  updateReceiveOrderStatus,
  deleteReceiveOrder
};

const pool = require('../config/database');

/**
 * Export Controller
 * Handles export order creation and inventory deduction
 */

// Create export order and deduct inventory
const createExportOrder = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { distributionId, items, agency, date, total } = req.body;
    const { userId, accountId } = req.user;
    
    // Validate
    if (!items || items.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn ít nhất một sản phẩm'
      });
    }
    
    // Generate export code
    const codeResult = await client.query(
      "SELECT COALESCE(MAX(CAST(SUBSTRING(distribution_code FROM 3) AS INTEGER)), 0) + 1 as next_num FROM ordermgmt.distribution WHERE distribution_code ~ '^PX[0-9]+$'"
    );
    const nextNum = codeResult.rows[0].next_num;
    const exportCode = `PX${String(nextNum).padStart(3, '0')}`;
    
    // Get agency_id from agency name
    const agencyResult = await client.query(
      'SELECT agency_id FROM master.agency WHERE name = $1 LIMIT 1',
      [agency]
    );
    
    if (agencyResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Không tìm thấy đại lý: ${agency}`
      });
    }
    
    const agencyId = agencyResult.rows[0].agency_id;
    
    // Create export record and mark as shipping with delivery date same as order_date
    const exportResult = await client.query(
      `INSERT INTO ordermgmt.distribution (distribution_code, agency_id, order_date, delivery_date, receive_date, total_amount, status, notes, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $3, NULL, $4, 'shipping', 'Phiếu xuất', $5, NOW(), NOW())
       RETURNING distribution_id, distribution_code`,
      [exportCode, agencyId, date, total, accountId || userId]
    );
    
    if (exportResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(500).json({
        success: false,
        message: 'Không thể tạo phiếu xuất'
      });
    }
    
    const exportId = exportResult.rows[0].distribution_id;
    
    // Deduct inventory for each item
    for (const item of items) {
      let productId = item.productId || item.product_id;
      const batchCode = item.batch;
      const quantity = item.quantity;
      const price = item.price;
      
      // If productId not provided, try to find it by product name
      if (!productId) {
        const productNameResult = await client.query(
          'SELECT product_id FROM master.product WHERE name = $1 LIMIT 1',
          [item.productName]
        );
        if (productNameResult.rows.length > 0) {
          productId = productNameResult.rows[0].product_id;
        }
      }
      
      if (!productId || !batchCode || !quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Sản phẩm hoặc lô hàng không hợp lệ`
        });
      }
      
      // Find inventory_product entry with this batch
      const invResult = await client.query(
        `SELECT ip.inventory_product_id 
         FROM master.inventory_product ip
         JOIN master.inventory_batch ib ON ib.inventory_product_id = ip.inventory_product_id
         WHERE ip.product_id = $1 AND ib.batch_code = $2
         LIMIT 1`,
        [productId, batchCode]
      );
      
      if (invResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Không tìm thấy lô hàng ${batchCode} cho sản phẩm ID ${productId}`
        });
      }
      
      const invProductId = invResult.rows[0].inventory_product_id;
      
      // Check if there's enough inventory
      const batchCheckResult = await client.query(
        `SELECT quantity FROM master.inventory_batch 
         WHERE batch_code = $1 AND inventory_product_id = $2`,
        [batchCode, invProductId]
      );
      
      if (batchCheckResult.rows.length === 0 || batchCheckResult.rows[0].quantity < quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Không đủ tồn kho cho lô ${batchCode}. Số lượng yêu cầu: ${quantity}, Số lượng có: ${batchCheckResult.rows[0]?.quantity || 0}`
        });
      }
      
      // Deduct from inventory_batch
      await client.query(
        `UPDATE master.inventory_batch 
         SET quantity = quantity - $1
         WHERE batch_code = $2 AND inventory_product_id = $3`,
        [quantity, batchCode, invProductId]
      );
      
      // Deduct from inventory_product total
      await client.query(
        `UPDATE master.inventory_product 
         SET quantity = quantity - $1
         WHERE inventory_product_id = $2`,
        [quantity, invProductId]
      );
      
      // Record export detail
      await client.query(
        `INSERT INTO ordermgmt.distribution_detail (distribution_id, product_id, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [exportId, productId, quantity, price || 0, (price || 0) * quantity]
      );
    }
    
    await client.query('COMMIT');
    
    // Auto-create a payment record for this export
    try {
      // Get agency info for the payment
      const agencyInfoResult = await client.query(
        'SELECT agency_id FROM master.agency WHERE name = $1 LIMIT 1',
        [agency]
      );
      
      if (agencyInfoResult.rows.length > 0) {
        const targetAgencyId = agencyInfoResult.rows[0].agency_id;
        
        // Generate payment code
        const paymentCodeResult = await client.query(
          'SELECT COUNT(*) as count FROM finance.payment'
        );
        const paymentCount = parseInt(paymentCodeResult.rows[0].count) + 1;
        const paymentCode = `PT${String(paymentCount).padStart(5, '0')}`;
        
        // Create payment record with distribution_id
        await client.query(
          `INSERT INTO finance.payment (code, agency_id, distribution_id, amount, payment_date, note, status, collected_by, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
          [paymentCode, targetAgencyId, exportId, total, date, 'Phiếu thu từ phiếu xuất ' + exportCode, 'pending', accountId || userId]
        );
        
        console.log('[Auto-create Payment] Created:', paymentCode, 'for export:', exportCode);
      }
    } catch (paymentError) {
      console.error('[Auto-create Payment] Error:', paymentError);
      // Don't fail the export if payment creation fails
    }
    
    res.json({
      success: true,
      data: {
        exportId,
        exportCode,
        message: 'Tạo phiếu xuất thành công, đã cập nhật tồn kho'
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating export order:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo phiếu xuất'
    });
  } finally {
    client.release();
  }
};

module.exports = {
  getAllExports: async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT 
          distribution_id as id,
          distribution_code as code,
          agency_id,
          total_amount as total,
          status,
          created_at as date,
          updated_at
        FROM ordermgmt.distribution
        WHERE distribution_code LIKE 'PX%'
        ORDER BY created_at DESC
      `);
      
      return res.json({
        success: true,
        data: result.rows,
        message: 'Lấy danh sách phiếu xuất thành công'
      });
    } catch (error) {
      console.error('Error getting exports:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy danh sách phiếu xuất'
      });
    }
  },

  createExportOrder

};

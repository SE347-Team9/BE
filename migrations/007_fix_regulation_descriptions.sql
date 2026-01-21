-- Migration: Fix regulation descriptions with proper UTF-8 encoding
-- This fixes the garbled Vietnamese text

BEGIN;

-- Update all regulation descriptions with proper Vietnamese text
UPDATE config.regulation SET description = 'Trần nợ đại lý cấp 1' WHERE regulation_key = 'max_debt_level_1';
UPDATE config.regulation SET description = 'Trần nợ đại lý cấp 2' WHERE regulation_key = 'max_debt_level_2';
UPDATE config.regulation SET description = 'Trần nợ đại lý cấp 3' WHERE regulation_key = 'max_debt_level_3';
UPDATE config.regulation SET description = 'Số lượng đơn hàng tối đa trên ngày' WHERE regulation_key = 'max_delivery_order';
UPDATE config.regulation SET description = 'Giá trị đơn hàng tối đa' WHERE regulation_key = 'max_order_value';
UPDATE config.regulation SET description = 'Một phiếu nhập chỉ chọn được 1 nhà sản xuất' WHERE regulation_key = 'single_supplier_per_import';
UPDATE config.regulation SET description = 'Doanh số tối thiểu để lên Cấp 1 (VND/tháng)' WHERE regulation_key = 'min_sales_level_1';
UPDATE config.regulation SET description = 'Doanh số tối thiểu để lên Cấp 2 (VND/tháng)' WHERE regulation_key = 'min_sales_level_2';
UPDATE config.regulation SET description = 'Số tháng hoạt động tối thiểu để lên Cấp 1' WHERE regulation_key = 'min_months_level_1';
UPDATE config.regulation SET description = 'Số tháng hoạt động tối thiểu để lên Cấp 2' WHERE regulation_key = 'min_months_level_2';
UPDATE config.regulation SET description = 'Tỷ lệ thanh toán đúng hạn tối thiểu để lên Cấp 1 (%)' WHERE regulation_key = 'min_payment_rate_level_1';
UPDATE config.regulation SET description = 'Tỷ lệ thanh toán đúng hạn tối thiểu để lên Cấp 2 (%)' WHERE regulation_key = 'min_payment_rate_level_2';
UPDATE config.regulation SET description = 'Chiết khấu cho đại lý cấp 1 (%)' WHERE regulation_key = 'discount_level_1';
UPDATE config.regulation SET description = 'Chiết khấu cho đại lý cấp 2 (%)' WHERE regulation_key = 'discount_level_2';
UPDATE config.regulation SET description = 'Chiết khấu cho đại lý cấp 3 (%)' WHERE regulation_key = 'discount_level_3';
UPDATE config.regulation SET description = 'Doanh số tối thiểu để lên Cấp 1' WHERE regulation_key = 'agency_level_1_threshold';
UPDATE config.regulation SET description = 'Doanh số tối thiểu để lên Cấp 2' WHERE regulation_key = 'agency_level_2_threshold';
UPDATE config.regulation SET description = 'Tỷ lệ nợ tối đa' WHERE regulation_key = 'max_debt_ratio';
UPDATE config.regulation SET description = 'Giá trị đơn hàng tối thiểu' WHERE regulation_key = 'min_order_amount';

-- Verify the changes
SELECT regulation_key, description FROM config.regulation ORDER BY regulation_key;

COMMIT;

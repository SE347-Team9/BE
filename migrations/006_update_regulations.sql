-- Migration: Update regulations data with Vietnamese descriptions
-- This adds comprehensive regulation data for the admin panel

BEGIN;

-- Add default value for updated_at if not exists
ALTER TABLE config.regulation 
  ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

-- Clear existing regulations
DELETE FROM config.regulation;

-- Insert comprehensive regulation data based on the image
INSERT INTO config.regulation (regulation_key, regulation_value, description, data_type, updated_at) VALUES
-- Debt level regulations
('max_debt_level_1', '100000000', 'Trần nợ đại lý cấp 1', 'number', CURRENT_TIMESTAMP),
('max_debt_level_2', '50000000', 'Trần nợ đại lý cấp 2', 'number', CURRENT_TIMESTAMP),
('max_debt_level_3', '20000000', 'Trần nợ đại lý cấp 3', 'number', CURRENT_TIMESTAMP),

-- Delivery order settings
('max_delivery_order', '10', 'Số lượng đơn hàng tối đa trên ngày', 'number', CURRENT_TIMESTAMP),

-- Order value settings
('max_order_value', '50000000', 'Giá trị đơn hàng tối đa', 'number', CURRENT_TIMESTAMP),

-- Import settings
('single_supplier_per_import', '1', 'Một phiếu nhập chỉ chọn được 1 nhà sản xuất', 'number', CURRENT_TIMESTAMP),

-- Sales level thresholds (VND/tháng)
('min_sales_level_1', '100000000', 'Doanh số tối thiểu để lên Cấp 1 (VND/tháng)', 'number', CURRENT_TIMESTAMP),
('min_sales_level_2', '50000000', 'Doanh số tối thiểu để lên Cấp 2 (VND/tháng)', 'number', CURRENT_TIMESTAMP),

-- Monthly activity settings
('min_months_level_1', '6', 'Số tháng hoạt động tối thiểu để lên Cấp 1', 'number', CURRENT_TIMESTAMP),
('min_months_level_2', '3', 'Số tháng hoạt động tối thiểu để lên Cấp 2', 'number', CURRENT_TIMESTAMP),

-- Payment rate settings
('min_payment_rate_level_1', '90', 'Tỷ lệ thanh toán đúng hạn tối thiểu để lên Cấp 1 (%)', 'number', CURRENT_TIMESTAMP),
('min_payment_rate_level_2', '80', 'Tỷ lệ thanh toán đúng hạn tối thiểu để lên Cấp 2 (%)', 'number', CURRENT_TIMESTAMP),

-- Discount level settings
('discount_level_1', '5', 'Chiết khấu cho đại lý cấp 1 (%)', 'number', CURRENT_TIMESTAMP),
('discount_level_2', '3', 'Chiết khấu cho đại lý cấp 2 (%)', 'number', CURRENT_TIMESTAMP),
('discount_level_3', '2', 'Chiết khấu cho đại lý cấp 3 (%)', 'number', CURRENT_TIMESTAMP),

-- Legacy settings (keep for compatibility)
('agency_level_1_threshold', '100000000', 'Doanh số tối thiểu để lên Cấp 1', 'number', CURRENT_TIMESTAMP),
('agency_level_2_threshold', '50000000', 'Doanh số tối thiểu để lên Cấp 2', 'number', CURRENT_TIMESTAMP),
('max_debt_ratio', '0.5', 'Tỷ lệ nợ tối đa', 'number', CURRENT_TIMESTAMP),
('min_order_amount', '1000000', 'Giá trị đơn hàng tối thiểu', 'number', CURRENT_TIMESTAMP);

-- Verify the changes
SELECT regulation_key, regulation_value, description 
FROM config.regulation 
ORDER BY regulation_key;

COMMIT;

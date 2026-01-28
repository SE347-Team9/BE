-- =====================================================
-- MIGRATION: INSERT SAMPLE RECEIVE GOODS DATA
-- Description: Insert sample receive orders (phiếu nhận) with 'pending' status for agencies
-- Run: psql -U postgres -d distribution_db -f migrations/011_insert_receive_goods_pending.sql
-- =====================================================

-- Clean up existing pending receive records for fresh insert
-- DELETE FROM ordermgmt.distribution_detail WHERE distribution_id IN 
--   (SELECT distribution_id FROM ordermgmt.distribution WHERE distribution_code LIKE 'PX%' AND status = 'pending');
-- DELETE FROM ordermgmt.distribution WHERE distribution_code LIKE 'PX%' AND status = 'pending';

-- Insert sample receive orders (phiếu nhận chờ xác nhận) for agencies
-- Using PX prefix for agency receive codes

INSERT INTO ordermgmt.distribution 
(distribution_code, agency_id, driver_id, order_date, delivery_date, total_amount, status, notes, created_by, created_at, updated_at)
VALUES
-- Agency DL001 (Đại lý Miền Đông)
('PX000001', 1, 1, '2026-01-20', '2026-01-22', 10500000, 'pending', 'Phiếu nhận chờ xác nhận - Lô 1', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('PX000002', 1, 1, '2026-01-21', '2026-01-23', 15750000, 'pending', 'Phiếu nhận chờ xác nhận - Lô 2', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('PX000003', 1, 2, '2026-01-19', '2026-01-21', 8900000, 'pending', 'Phiếu nhận chờ xác nhận - Lô 3', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Agency DL002 (Đại lý Miền Tây)
('PX000004', 2, 2, '2026-01-20', '2026-01-22', 12300000, 'pending', 'Phiếu nhận chờ xác nhận - Lô 1', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('PX000005', 2, 3, '2026-01-21', '2026-01-23', 9450000, 'pending', 'Phiếu nhận chờ xác nhận - Lô 2', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Agency DL003 (Đại lý Miền Nam)
('PX000006', 3, 3, '2026-01-20', '2026-01-22', 14200000, 'pending', 'Phiếu nhận chờ xác nhận - Lô 1', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('PX000007', 3, 4, '2026-01-21', '2026-01-23', 11600000, 'pending', 'Phiếu nhận chờ xác nhận - Lô 2', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('PX000008', 3, 1, '2026-01-22', '2026-01-24', 13450000, 'pending', 'Phiếu nhận chờ xác nhận - Lô 3', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Agency DL004 (Đại lý Miền Bắc)
('PX000009', 4, 2, '2026-01-20', '2026-01-22', 9800000, 'pending', 'Phiếu nhận chờ xác nhận - Lô 1', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Agency DL005 (Đại lý Trung Tâm)
('PX000010', 5, 4, '2026-01-21', '2026-01-23', 16500000, 'pending', 'Phiếu nhận chờ xác nhận - Lô 1', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (distribution_code) DO NOTHING;

-- Insert distribution details for each receive order
-- For PX000001 (DL001 - 10,500,000đ)
INSERT INTO ordermgmt.distribution_detail 
(distribution_id, product_id, quantity, unit_price, total_price, created_at)
SELECT 
  (SELECT distribution_id FROM ordermgmt.distribution WHERE distribution_code = 'PX000001'), 
  product_id, 
  quantity, 
  unit_price, 
  total_price,
  CURRENT_TIMESTAMP
FROM (VALUES
  (1, 100, 85000, 8500000),
  (2, 50, 40000, 2000000)
) AS t(product_id, quantity, unit_price, total_price)
ON CONFLICT DO NOTHING;

-- For PX000002 (DL001 - 15,750,000đ)
INSERT INTO ordermgmt.distribution_detail 
(distribution_id, product_id, quantity, unit_price, total_price, created_at)
SELECT 
  (SELECT distribution_id FROM ordermgmt.distribution WHERE distribution_code = 'PX000002'), 
  product_id, 
  quantity, 
  unit_price, 
  total_price,
  CURRENT_TIMESTAMP
FROM (VALUES
  (3, 75, 150000, 11250000),
  (4, 30, 150000, 4500000)
) AS t(product_id, quantity, unit_price, total_price)
ON CONFLICT DO NOTHING;

-- For PX000003 (DL001 - 8,900,000đ)
INSERT INTO ordermgmt.distribution_detail 
(distribution_id, product_id, quantity, unit_price, total_price, created_at)
SELECT 
  (SELECT distribution_id FROM ordermgmt.distribution WHERE distribution_code = 'PX000003'), 
  product_id, 
  quantity, 
  unit_price, 
  total_price,
  CURRENT_TIMESTAMP
FROM (VALUES
  (5, 60, 148000, 8880000),
  (6, 5, 4000, 20000)
) AS t(product_id, quantity, unit_price, total_price)
ON CONFLICT DO NOTHING;

-- For PX000004 (DL002 - 12,300,000đ)
INSERT INTO ordermgmt.distribution_detail 
(distribution_id, product_id, quantity, unit_price, total_price, created_at)
SELECT 
  (SELECT distribution_id FROM ordermgmt.distribution WHERE distribution_code = 'PX000004'), 
  product_id, 
  quantity, 
  unit_price, 
  total_price,
  CURRENT_TIMESTAMP
FROM (VALUES
  (2, 80, 40000, 3200000),
  (7, 55, 165000, 9100000)
) AS t(product_id, quantity, unit_price, total_price)
ON CONFLICT DO NOTHING;

-- For PX000005 (DL002 - 9,450,000đ)
INSERT INTO ordermgmt.distribution_detail 
(distribution_id, product_id, quantity, unit_price, total_price, created_at)
SELECT 
  (SELECT distribution_id FROM ordermgmt.distribution WHERE distribution_code = 'PX000005'), 
  product_id, 
  quantity, 
  unit_price, 
  total_price,
  CURRENT_TIMESTAMP
FROM (VALUES
  (1, 70, 85000, 5950000),
  (8, 40, 85000, 3400000)
) AS t(product_id, quantity, unit_price, total_price)
ON CONFLICT DO NOTHING;

-- For PX000006 (DL003 - 14,200,000đ)
INSERT INTO ordermgmt.distribution_detail 
(distribution_id, product_id, quantity, unit_price, total_price, created_at)
SELECT 
  (SELECT distribution_id FROM ordermgmt.distribution WHERE distribution_code = 'PX000006'), 
  product_id, 
  quantity, 
  unit_price, 
  total_price,
  CURRENT_TIMESTAMP
FROM (VALUES
  (3, 60, 150000, 9000000),
  (4, 34, 150000, 5100000),
  (9, 10, 10000, 100000)
) AS t(product_id, quantity, unit_price, total_price)
ON CONFLICT DO NOTHING;

-- For PX000007 (DL003 - 11,600,000đ)
INSERT INTO ordermgmt.distribution_detail 
(distribution_id, product_id, quantity, unit_price, total_price, created_at)
SELECT 
  (SELECT distribution_id FROM ordermgmt.distribution WHERE distribution_code = 'PX000007'), 
  product_id, 
  quantity, 
  unit_price, 
  total_price,
  CURRENT_TIMESTAMP
FROM (VALUES
  (5, 50, 148000, 7400000),
  (6, 10, 4000, 40000),
  (10, 65, 62000, 4030000)
) AS t(product_id, quantity, unit_price, total_price)
ON CONFLICT DO NOTHING;

-- For PX000008 (DL003 - 13,450,000đ)
INSERT INTO ordermgmt.distribution_detail 
(distribution_id, product_id, quantity, unit_price, total_price, created_at)
SELECT 
  (SELECT distribution_id FROM ordermgmt.distribution WHERE distribution_code = 'PX000008'), 
  product_id, 
  quantity, 
  unit_price, 
  total_price,
  CURRENT_TIMESTAMP
FROM (VALUES
  (7, 50, 165000, 8250000),
  (8, 50, 85000, 4250000),
  (1, 10, 85000, 850000)
) AS t(product_id, quantity, unit_price, total_price)
ON CONFLICT DO NOTHING;

-- For PX000009 (DL004 - 9,800,000đ)
INSERT INTO ordermgmt.distribution_detail 
(distribution_id, product_id, quantity, unit_price, total_price, created_at)
SELECT 
  (SELECT distribution_id FROM ordermgmt.distribution WHERE distribution_code = 'PX000009'), 
  product_id, 
  quantity, 
  unit_price, 
  total_price,
  CURRENT_TIMESTAMP
FROM (VALUES
  (2, 95, 40000, 3800000),
  (3, 40, 150000, 6000000)
) AS t(product_id, quantity, unit_price, total_price)
ON CONFLICT DO NOTHING;

-- For PX000010 (DL005 - 16,500,000đ)
INSERT INTO ordermgmt.distribution_detail 
(distribution_id, product_id, quantity, unit_price, total_price, created_at)
SELECT 
  (SELECT distribution_id FROM ordermgmt.distribution WHERE distribution_code = 'PX000010'), 
  product_id, 
  quantity, 
  unit_price, 
  total_price,
  CURRENT_TIMESTAMP
FROM (VALUES
  (1, 90, 85000, 7650000),
  (3, 45, 150000, 6750000),
  (7, 20, 165000, 3300000)
) AS t(product_id, quantity, unit_price, total_price)
ON CONFLICT DO NOTHING;

-- =====================================================
-- Verify inserted data
-- =====================================================
SELECT 'Inserted receive orders (pending status):' as status;
SELECT 
  distribution_code,
  (SELECT name FROM master.agency WHERE agency_id = d.agency_id) as agency_name,
  total_amount,
  status,
  created_at
FROM ordermgmt.distribution d
WHERE distribution_code LIKE 'PX%' AND status = 'pending'
ORDER BY distribution_code;

SELECT 'Total pending receive orders: ' || COUNT(*) FROM ordermgmt.distribution WHERE distribution_code LIKE 'PX%' AND status = 'pending';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
SELECT 'Migration 011_insert_receive_goods_pending.sql completed successfully!' as message;

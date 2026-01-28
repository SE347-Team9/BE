-- =====================================================
-- MIGRATION: CREATE RECEIVE ORDERS TABLES
-- Description: Create tables to manage receive orders
-- Run: psql -U postgres -d distribution_db -f migrations/008_create_receive_orders.sql
-- =====================================================

-- Table: warehouse.receive_order (Receive Order)
CREATE TABLE IF NOT EXISTS warehouse.receive_order (
    receive_order_id SERIAL PRIMARY KEY,
    receive_code VARCHAR(50) UNIQUE NOT NULL,
    supplier_id INTEGER REFERENCES master.supplier(supplier_id) ON DELETE SET NULL,
    receive_date DATE DEFAULT CURRENT_DATE,
    total_amount BIGINT DEFAULT 0,
    notes TEXT,
    created_by INTEGER REFERENCES auth.account(account_id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: warehouse.receive_order_detail (Receive Order Detail)
CREATE TABLE IF NOT EXISTS warehouse.receive_order_detail (
    receive_order_detail_id SERIAL PRIMARY KEY,
    receive_order_id INTEGER REFERENCES warehouse.receive_order(receive_order_id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES master.product(product_id) ON DELETE CASCADE,
    batch_code VARCHAR(50),
    quantity INTEGER NOT NULL,
    unit_price BIGINT NOT NULL,
    total_price BIGINT NOT NULL,
    manufacturing_date DATE,
    expiry_date DATE,
    warehouse VARCHAR(100) DEFAULT 'Kho thuong',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for receive_order
CREATE INDEX IF NOT EXISTS idx_receive_order_code ON warehouse.receive_order(receive_code);
CREATE INDEX IF NOT EXISTS idx_receive_order_supplier ON warehouse.receive_order(supplier_id);
CREATE INDEX IF NOT EXISTS idx_receive_order_status ON warehouse.receive_order(status);
CREATE INDEX IF NOT EXISTS idx_receive_order_date ON warehouse.receive_order(receive_date);
CREATE INDEX IF NOT EXISTS idx_receive_order_detail_receive ON warehouse.receive_order_detail(receive_order_id);
CREATE INDEX IF NOT EXISTS idx_receive_order_detail_product ON warehouse.receive_order_detail(product_id);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

SELECT 'Migration 008_create_receive_orders.sql completed successfully!' as message;


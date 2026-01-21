-- =====================================================
-- MIGRATION: CREATE ALL SCHEMAS AND TABLES
-- Description: Tạo toàn bộ schemas và tables cho hệ thống
-- Run: psql -U postgres -d distribution_db -f migrations/001_create_all_schemas_and_tables.sql
-- =====================================================

-- Drop existing schemas if needed (uncomment if you want fresh start)
-- DROP SCHEMA IF EXISTS auth CASCADE;
-- DROP SCHEMA IF EXISTS master CASCADE;
-- DROP SCHEMA IF EXISTS warehouse CASCADE;
-- DROP SCHEMA IF EXISTS ordermgmt CASCADE;
-- DROP SCHEMA IF EXISTS finance CASCADE;
-- DROP SCHEMA IF EXISTS config CASCADE;

-- =====================================================
-- CREATE SCHEMAS
-- =====================================================
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS master;
CREATE SCHEMA IF NOT EXISTS warehouse;
CREATE SCHEMA IF NOT EXISTS ordermgmt;
CREATE SCHEMA IF NOT EXISTS finance;
CREATE SCHEMA IF NOT EXISTS config;

-- =====================================================
-- AUTH SCHEMA - Quản lý tài khoản và người dùng
-- =====================================================

-- Table: auth.account (Tài khoản đăng nhập)
CREATE TABLE IF NOT EXISTS auth.account (
    account_id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'staff', 'agency')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: auth.user (Thông tin người dùng)
CREATE TABLE IF NOT EXISTS auth."user" (
    user_id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES auth.account(account_id) ON DELETE CASCADE,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(200),
    phone VARCHAR(20),
    staff_id INTEGER, -- Link to master.staff
    agency_id INTEGER, -- Link to master.agency
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MASTER SCHEMA - Dữ liệu chính
-- =====================================================

-- Table: master.district (Quận/Huyện)
CREATE TABLE IF NOT EXISTS master.district (
    district_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: master.staff (Nhân viên)
CREATE TABLE IF NOT EXISTS master.staff (
    staff_id SERIAL PRIMARY KEY,
    full_name VARCHAR(200) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(200),
    address TEXT,
    date_of_birth DATE,
    hire_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: master.agency (Đại lý)
CREATE TABLE IF NOT EXISTS master.agency (
    agency_id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    address TEXT NOT NULL,
    district VARCHAR(100),
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(200),
    level VARCHAR(20) DEFAULT 'bronze' CHECK (level IN ('bronze', 'silver', 'gold', 'platinum')),
    sales_volume BIGINT DEFAULT 0,
    max_debt BIGINT DEFAULT 50000000,
    current_debt BIGINT DEFAULT 0,
    debt_limit BIGINT DEFAULT 50000000,
    managed_by_staff_id INTEGER REFERENCES master.staff(staff_id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: master.product_category (Danh mục sản phẩm)
CREATE TABLE IF NOT EXISTS master.product_category (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: master.supplier (Nhà cung cấp)
CREATE TABLE IF NOT EXISTS master.supplier (
    supplier_id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(200),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: master.product (Sản phẩm)
CREATE TABLE IF NOT EXISTS master.product (
    product_id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    category_id INTEGER REFERENCES master.product_category(category_id) ON DELETE SET NULL,
    supplier_id INTEGER REFERENCES master.supplier(supplier_id) ON DELETE SET NULL,
    unit VARCHAR(50) DEFAULT 'Thùng',
    cost_price BIGINT DEFAULT 0,
    selling_price BIGINT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: master.inventory_product (Sản phẩm trong kho)
CREATE TABLE IF NOT EXISTS master.inventory_product (
    inventory_product_id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES master.product(product_id) ON DELETE CASCADE,
    total_quantity INTEGER DEFAULT 0,
    available_quantity INTEGER DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: master.inventory_batch (Lô hàng)
CREATE TABLE IF NOT EXISTS master.inventory_batch (
    batch_id SERIAL PRIMARY KEY,
    batch_code VARCHAR(50) UNIQUE NOT NULL,
    product_id INTEGER REFERENCES master.product(product_id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    remaining_quantity INTEGER NOT NULL,
    manufacturing_date DATE,
    expiry_date DATE,
    status VARCHAR(20) DEFAULT 'normal' CHECK (status IN ('normal', 'near_expiry', 'expired', 'low_stock', 'out_of_stock')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: master.driver (Tài xế)
CREATE TABLE IF NOT EXISTS master.driver (
    driver_id SERIAL PRIMARY KEY,
    full_name VARCHAR(200) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    license_number VARCHAR(50),
    vehicle_number VARCHAR(50),
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'busy', 'inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- WAREHOUSE SCHEMA - Quản lý kho
-- =====================================================

-- Table: warehouse.import (Phiếu nhập kho)
CREATE TABLE IF NOT EXISTS warehouse.import (
    import_id SERIAL PRIMARY KEY,
    import_code VARCHAR(50) UNIQUE NOT NULL,
    supplier_id INTEGER REFERENCES master.supplier(supplier_id) ON DELETE SET NULL,
    import_date DATE DEFAULT CURRENT_DATE,
    total_amount BIGINT DEFAULT 0,
    notes TEXT,
    created_by INTEGER REFERENCES auth.account(account_id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: warehouse.import_detail (Chi tiết phiếu nhập)
CREATE TABLE IF NOT EXISTS warehouse.import_detail (
    import_detail_id SERIAL PRIMARY KEY,
    import_id INTEGER REFERENCES warehouse.import(import_id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES master.product(product_id) ON DELETE CASCADE,
    batch_code VARCHAR(50),
    quantity INTEGER NOT NULL,
    unit_price BIGINT NOT NULL,
    total_price BIGINT NOT NULL,
    manufacturing_date DATE,
    expiry_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ORDERMGMT SCHEMA - Quản lý đơn hàng
-- =====================================================

-- Table: ordermgmt.distribution (Đơn phân phối)
CREATE TABLE IF NOT EXISTS ordermgmt.distribution (
    distribution_id SERIAL PRIMARY KEY,
    distribution_code VARCHAR(50) UNIQUE NOT NULL,
    agency_id INTEGER REFERENCES master.agency(agency_id) ON DELETE SET NULL,
    driver_id INTEGER REFERENCES master.driver(driver_id) ON DELETE SET NULL,
    order_date DATE DEFAULT CURRENT_DATE,
    delivery_date DATE,
    total_amount BIGINT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipping', 'delivered', 'cancelled')),
    notes TEXT,
    created_by INTEGER REFERENCES auth.account(account_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: ordermgmt.distribution_detail (Chi tiết đơn phân phối)
CREATE TABLE IF NOT EXISTS ordermgmt.distribution_detail (
    distribution_detail_id SERIAL PRIMARY KEY,
    distribution_id INTEGER REFERENCES ordermgmt.distribution(distribution_id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES master.product(product_id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    unit_price BIGINT NOT NULL,
    total_price BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- FINANCE SCHEMA - Quản lý tài chính
-- =====================================================

-- Table: finance.payment (Phiếu thu)
CREATE TABLE IF NOT EXISTS finance.payment (
    payment_id SERIAL PRIMARY KEY,
    payment_code VARCHAR(50) UNIQUE NOT NULL,
    agency_id INTEGER REFERENCES master.agency(agency_id) ON DELETE SET NULL,
    distribution_id INTEGER REFERENCES ordermgmt.distribution(distribution_id) ON DELETE SET NULL,
    amount BIGINT NOT NULL,
    payment_date DATE DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer', 'other')),
    notes TEXT,
    created_by INTEGER REFERENCES auth.account(account_id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- CONFIG SCHEMA - Cấu hình hệ thống
-- =====================================================

-- Table: config.regulation (Quy định)
CREATE TABLE IF NOT EXISTS config.regulation (
    regulation_id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    value NUMERIC(15, 2) DEFAULT 0,
    unit VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Auth indexes
CREATE INDEX IF NOT EXISTS idx_account_username ON auth.account(username);
CREATE INDEX IF NOT EXISTS idx_account_role ON auth.account(role);
CREATE INDEX IF NOT EXISTS idx_user_account ON auth."user"(account_id);
CREATE INDEX IF NOT EXISTS idx_user_staff ON auth."user"(staff_id);
CREATE INDEX IF NOT EXISTS idx_user_agency ON auth."user"(agency_id);

-- Master indexes
CREATE INDEX IF NOT EXISTS idx_agency_code ON master.agency(code);
CREATE INDEX IF NOT EXISTS idx_agency_staff ON master.agency(managed_by_staff_id);
CREATE INDEX IF NOT EXISTS idx_product_code ON master.product(code);
CREATE INDEX IF NOT EXISTS idx_product_category ON master.product(category_id);
CREATE INDEX IF NOT EXISTS idx_product_supplier ON master.product(supplier_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON master.inventory_product(product_id);
CREATE INDEX IF NOT EXISTS idx_batch_product ON master.inventory_batch(product_id);
CREATE INDEX IF NOT EXISTS idx_batch_code ON master.inventory_batch(batch_code);

-- Warehouse indexes
CREATE INDEX IF NOT EXISTS idx_import_code ON warehouse.import(import_code);
CREATE INDEX IF NOT EXISTS idx_import_supplier ON warehouse.import(supplier_id);
CREATE INDEX IF NOT EXISTS idx_import_detail_import ON warehouse.import_detail(import_id);
CREATE INDEX IF NOT EXISTS idx_import_detail_product ON warehouse.import_detail(product_id);

-- Order indexes
CREATE INDEX IF NOT EXISTS idx_distribution_code ON ordermgmt.distribution(distribution_code);
CREATE INDEX IF NOT EXISTS idx_distribution_agency ON ordermgmt.distribution(agency_id);
CREATE INDEX IF NOT EXISTS idx_distribution_driver ON ordermgmt.distribution(driver_id);
CREATE INDEX IF NOT EXISTS idx_distribution_detail_dist ON ordermgmt.distribution_detail(distribution_id);
CREATE INDEX IF NOT EXISTS idx_distribution_detail_product ON ordermgmt.distribution_detail(product_id);

-- Finance indexes
CREATE INDEX IF NOT EXISTS idx_payment_code ON finance.payment(payment_code);
CREATE INDEX IF NOT EXISTS idx_payment_agency ON finance.payment(agency_id);
CREATE INDEX IF NOT EXISTS idx_payment_distribution ON finance.payment(distribution_id);

-- Config indexes
CREATE INDEX IF NOT EXISTS idx_regulation_code ON config.regulation(code);

-- =====================================================
-- CREATE FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN
        SELECT table_schema || '.' || table_name
        FROM information_schema.columns
        WHERE column_name = 'updated_at'
        AND table_schema IN ('auth', 'master', 'warehouse', 'ordermgmt', 'finance', 'config')
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON %s', 
            replace(t, '.', '_'), t);
        EXECUTE format('CREATE TRIGGER update_%I_updated_at 
            BEFORE UPDATE ON %s 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
            replace(t, '.', '_'), t);
    END LOOP;
END;
$$ language 'plpgsql';

-- =====================================================
-- GRANT PERMISSIONS (Optional - adjust as needed)
-- =====================================================

-- Grant usage on schemas
GRANT USAGE ON SCHEMA auth, master, warehouse, ordermgmt, finance, config TO postgres;

-- Grant privileges on all tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA auth, master, warehouse, ordermgmt, finance, config TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA auth, master, warehouse, ordermgmt, finance, config TO postgres;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

SELECT 'Migration 001_create_all_schemas_and_tables.sql completed successfully!' as message;

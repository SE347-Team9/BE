-- Migration: Change NUMERIC columns to BIGINT for agency table
-- This fixes the decimal display issue (0.00 -> 0)

BEGIN;

-- Step 1: Drop dependent views
DROP VIEW IF EXISTS finance.v_debt_summary CASCADE;
DROP VIEW IF EXISTS finance.v_sales_monthly CASCADE;

-- Step 2: Drop triggers that depend on sales_volume
DROP TRIGGER IF EXISTS tg_update_agency_level ON master.agency;

-- Step 3: Alter agency table columns from NUMERIC to BIGINT
ALTER TABLE master.agency 
  ALTER COLUMN sales_volume TYPE BIGINT USING sales_volume::BIGINT,
  ALTER COLUMN current_debt TYPE BIGINT USING current_debt::BIGINT,
  ALTER COLUMN debt_limit TYPE BIGINT USING debt_limit::BIGINT,
  ALTER COLUMN debt_limit SET DEFAULT 30000000;

-- Step 4: Recreate the trigger with BIGINT-compatible function
CREATE OR REPLACE FUNCTION f_update_agency_level() RETURNS TRIGGER AS $$
DECLARE
    level_1_threshold BIGINT;
    level_2_threshold BIGINT;
BEGIN
    -- Lấy ngưỡng từ bảng regulation
    SELECT CAST(regulation_value AS BIGINT) INTO level_1_threshold 
    FROM config.regulation WHERE regulation_key = 'agency_level_1_threshold';
    
    SELECT CAST(regulation_value AS BIGINT) INTO level_2_threshold 
    FROM config.regulation WHERE regulation_key = 'agency_level_2_threshold';
    
    -- Cập nhật cấp đại lý
    IF NEW.sales_volume >= level_1_threshold THEN
        NEW.level := 1;
    ELSIF NEW.sales_volume >= level_2_threshold THEN
        NEW.level := 2;
    ELSE
        NEW.level := 3;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_update_agency_level
BEFORE UPDATE OF sales_volume ON master.agency
FOR EACH ROW EXECUTE FUNCTION f_update_agency_level();

-- Step 5: Recreate views
CREATE OR REPLACE VIEW finance.v_debt_summary AS
SELECT
    ag.agency_id,
    ag.code AS agency_code,
    ag.name AS agency_name,
    ag.level AS agency_level,
    ag.sales_volume,
    ag.current_debt,
    ag.debt_limit,
    (ag.debt_limit - ag.current_debt) AS available_credit,
    ROUND((ag.current_debt::NUMERIC / NULLIF(ag.debt_limit, 0)) * 100, 2) AS debt_ratio_percent,
    st.full_name AS managed_by_staff,
    MAX(isu.issue_date) AS last_issue_date,
    MAX(pay.payment_date) AS last_payment_date,
    COUNT(DISTINCT isu.issue_id) AS total_orders,
    COUNT(DISTINCT pay.payment_id) AS total_payments
FROM master.agency ag
LEFT JOIN master.staff st ON st.staff_id = ag.managed_by_staff_id
LEFT JOIN ordermgmt.issue isu ON isu.agency_id = ag.agency_id
LEFT JOIN finance.payment pay ON pay.agency_id = ag.agency_id
GROUP BY ag.agency_id, ag.code, ag.name, ag.level, ag.sales_volume, 
         ag.current_debt, ag.debt_limit, st.full_name;

CREATE OR REPLACE VIEW finance.v_sales_monthly AS
SELECT
    DATE_TRUNC('month', issue_date) AS period,
    ag.agency_id,
    ag.code AS agency_code,
    ag.name AS agency_name,
    ag.level AS agency_level,
    COUNT(isu.issue_id) AS total_orders,
    SUM(isu.total_amount) AS total_sales,
    AVG(isu.total_amount) AS avg_order_value
FROM ordermgmt.issue isu
JOIN master.agency ag ON ag.agency_id = isu.agency_id
WHERE isu.status = 'confirmed'
GROUP BY DATE_TRUNC('month', issue_date), ag.agency_id, ag.code, ag.name, ag.level
ORDER BY period DESC, total_sales DESC;

-- Check the result
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns 
WHERE table_schema = 'master' 
  AND table_name = 'agency' 
  AND column_name IN ('sales_volume', 'current_debt', 'debt_limit');

-- Verify existing data
SELECT code, level, sales_volume, current_debt, debt_limit 
FROM master.agency 
ORDER BY code;

COMMIT;

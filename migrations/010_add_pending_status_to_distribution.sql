-- =====================================================
-- MIGRATION: UPDATE DISTRIBUTION STATUS CONSTRAINTS
-- Description: Update distribution table to use correct status values:
--   pending (chờ xác nhận) -> shipping (đang giao) -> delivered (đã nhận)
-- Run: psql -U postgres -d distribution_db -f migrations/010_add_pending_status_to_distribution.sql
-- =====================================================

-- Drop existing constraint
ALTER TABLE ordermgmt.distribution 
DROP CONSTRAINT IF EXISTS distribution_status_check;

-- Add new constraint with correct status values
ALTER TABLE ordermgmt.distribution 
ADD CONSTRAINT distribution_status_check 
CHECK (status IN ('pending', 'shipping', 'delivered', 'cancelled'));

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

SELECT 'Migration 010 - Updated distribution status constraints successfully!' as message;


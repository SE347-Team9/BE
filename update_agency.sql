-- Update DL001 agency to have correct debt_limit
UPDATE master.agency
SET debt_limit = 30000000
WHERE code = 'DL001';

-- Check the result
SELECT code, level, sales_volume, current_debt, debt_limit FROM master.agency WHERE code = 'DL001';

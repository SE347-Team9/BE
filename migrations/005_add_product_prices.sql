-- Migration: Add cost_price and selling_price to product table
-- This replaces the single 'price' column with separate cost and selling prices

BEGIN;

-- Step 1: Add new columns to product table
ALTER TABLE master.product 
  ADD COLUMN cost_price BIGINT DEFAULT 0,
  ADD COLUMN selling_price BIGINT DEFAULT 0;

-- Step 2: Copy existing price data to selling_price (assuming 'price' was selling price)
UPDATE master.product 
SET selling_price = price,
    cost_price = ROUND(price * 0.7)::BIGINT  -- Estimate cost as 70% of selling price
WHERE price IS NOT NULL;

-- Step 3: Drop the old price column (optional - comment out if you want to keep it)
-- ALTER TABLE master.product DROP COLUMN price;

-- Step 4: Update existing products with realistic prices
UPDATE master.product 
SET 
  cost_price = CASE code
    -- Kho thường
    WHEN 'SP001' THEN 280000  -- Bia Hà Nội
    WHEN 'SP002' THEN 220000  -- Nước ngọt Pepsi
    WHEN 'SP003' THEN 65000   -- Nước khoáng LaVie
    WHEN 'SP004' THEN 28000   -- Bánh quy Oreo
    WHEN 'SP005' THEN 52000   -- Dầu ăn Neptune
    WHEN 'SP006' THEN 95000   -- Mì gói Hảo Hảo
    WHEN 'SP007' THEN 20000   -- Nước mắm Nam Ngư
    WHEN 'SP008' THEN 14000   -- Đường Biên Hòa
    WHEN 'SP009' THEN 68000   -- Café Trung Nguyên
    WHEN 'SP010' THEN 12000   -- Bánh snack Oishi
    WHEN 'SP011' THEN 17000   -- Nước tương Chinsu
    WHEN 'SP012' THEN 140000  -- Gạo ST25
    -- Kho mát
    WHEN 'SP013' THEN 35000   -- Sữa tươi Vinamilk
    WHEN 'SP014' THEN 30000   -- Yaourt TH True Milk
    WHEN 'SP015' THEN 43000   -- Phô mai Con Bò Cười
    WHEN 'SP016' THEN 75000   -- Thịt heo tươi
    WHEN 'SP017' THEN 200000  -- Thịt bò tươi
    WHEN 'SP018' THEN 18000   -- Rau xanh tươi
    WHEN 'SP019' THEN 35000   -- Trái cây tươi
    -- Kho đông lạnh
    WHEN 'SP020' THEN 52000   -- Kem Walls Magnum
    WHEN 'SP021' THEN 68000   -- Cá tra phi lê đông lạnh
    WHEN 'SP022' THEN 145000  -- Tôm đông lạnh
    WHEN 'SP023' THEN 60000   -- Thịt gà đông lạnh
    WHEN 'SP024' THEN 75000   -- Pizza đông lạnh
    ELSE cost_price
  END,
  selling_price = CASE code
    -- Kho thường
    WHEN 'SP001' THEN 350000  -- Bia Hà Nội
    WHEN 'SP002' THEN 280000  -- Nước ngọt Pepsi
    WHEN 'SP003' THEN 85000   -- Nước khoáng LaVie
    WHEN 'SP004' THEN 35000   -- Bánh quy Oreo
    WHEN 'SP005' THEN 65000   -- Dầu ăn Neptune
    WHEN 'SP006' THEN 120000  -- Mì gói Hảo Hảo
    WHEN 'SP007' THEN 25000   -- Nước mắm Nam Ngư
    WHEN 'SP008' THEN 18000   -- Đường Biên Hòa
    WHEN 'SP009' THEN 85000   -- Café Trung Nguyên
    WHEN 'SP010' THEN 15000   -- Bánh snack Oishi
    WHEN 'SP011' THEN 22000   -- Nước tương Chinsu
    WHEN 'SP012' THEN 180000  -- Gạo ST25
    -- Kho mát
    WHEN 'SP013' THEN 45000   -- Sữa tươi Vinamilk
    WHEN 'SP014' THEN 38000   -- Yaourt TH True Milk
    WHEN 'SP015' THEN 55000   -- Phô mai Con Bò Cười
    WHEN 'SP016' THEN 95000   -- Thịt heo tươi
    WHEN 'SP017' THEN 250000  -- Thịt bò tươi
    WHEN 'SP018' THEN 25000   -- Rau xanh tươi
    WHEN 'SP019' THEN 45000   -- Trái cây tươi
    -- Kho đông lạnh
    WHEN 'SP020' THEN 65000   -- Kem Walls Magnum
    WHEN 'SP021' THEN 85000   -- Cá tra phi lê đông lạnh
    WHEN 'SP022' THEN 180000  -- Tôm đông lạnh
    WHEN 'SP023' THEN 75000   -- Thịt gà đông lạnh
    WHEN 'SP024' THEN 95000   -- Pizza đông lạnh
    ELSE selling_price
  END;

-- Verify the changes
SELECT code, name, cost_price, selling_price, price 
FROM master.product 
ORDER BY code;

COMMIT;

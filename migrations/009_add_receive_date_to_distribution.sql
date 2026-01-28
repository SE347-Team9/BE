-- Add receive_date to ordermgmt.distribution for agency receive tracking
ALTER TABLE ordermgmt.distribution
ADD COLUMN IF NOT EXISTS receive_date DATE;

-- Optional index to query by receive_date
CREATE INDEX IF NOT EXISTS idx_distribution_receive_date ON ordermgmt.distribution(receive_date);

SELECT 'Migration 009_add_receive_date_to_distribution.sql completed successfully!' as message;

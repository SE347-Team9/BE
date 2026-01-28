-- Create reports table in master schema
CREATE TABLE IF NOT EXISTS master.reports (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    period VARCHAR(20),
    data JSONB,
    "createdBy" INTEGER,
    status VARCHAR(20) DEFAULT 'draft',
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

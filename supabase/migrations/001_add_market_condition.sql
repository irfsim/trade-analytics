-- Migration: Add market_condition to trades and create qqq_market_data cache table

-- Add market_condition column to trades table
ALTER TABLE trades ADD COLUMN IF NOT EXISTS market_condition TEXT
  CHECK (market_condition IN ('STRONG_UPTREND', 'UPTREND_CHOP', 'SIDEWAYS', 'DOWNTREND', 'CORRECTION'));

-- Create QQQ market data cache table
CREATE TABLE IF NOT EXISTS qqq_market_data (
    date DATE PRIMARY KEY,
    close DECIMAL(12, 4) NOT NULL,
    high_20d DECIMAL(12, 4),
    ma_10 DECIMAL(12, 4),
    ma_20 DECIMAL(12, 4),
    ma_50 DECIMAL(12, 4),
    ma_10_5d_ago DECIMAL(12, 4),
    ma_20_5d_ago DECIMAL(12, 4),
    market_condition TEXT CHECK (market_condition IN ('STRONG_UPTREND', 'UPTREND_CHOP', 'SIDEWAYS', 'DOWNTREND', 'CORRECTION')),
    cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on qqq_market_data
ALTER TABLE qqq_market_data ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for qqq_market_data
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'qqq_market_data' AND policyname = 'Allow read access') THEN
        CREATE POLICY "Allow read access" ON qqq_market_data FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'qqq_market_data' AND policyname = 'Allow insert') THEN
        CREATE POLICY "Allow insert" ON qqq_market_data FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'qqq_market_data' AND policyname = 'Allow update') THEN
        CREATE POLICY "Allow update" ON qqq_market_data FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'qqq_market_data' AND policyname = 'Allow delete') THEN
        CREATE POLICY "Allow delete" ON qqq_market_data FOR DELETE USING (true);
    END IF;
END $$;

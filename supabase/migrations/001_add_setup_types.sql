-- Migration: Add setup_types table
-- Run this on existing databases to add user-defined setup types

-- Create setup_types table (global, user-defined trading setups)
CREATE TABLE IF NOT EXISTS setup_types (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default setup types
INSERT INTO setup_types (name) VALUES
    ('Flag'),
    ('Base Breakout'),
    ('EP')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE setup_types ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Allow read access" ON setup_types FOR SELECT USING (true);
CREATE POLICY "Allow insert" ON setup_types FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update" ON setup_types FOR UPDATE USING (true);
CREATE POLICY "Allow delete" ON setup_types FOR DELETE USING (true);

-- Add setup_type_id column to trade_annotations (replacing old setup_type)
ALTER TABLE trade_annotations
ADD COLUMN IF NOT EXISTS setup_type_id INTEGER REFERENCES setup_types(id) ON DELETE SET NULL;

-- Migrate existing setup_type values to new setup_type_id
UPDATE trade_annotations ta
SET setup_type_id = st.id
FROM setup_types st
WHERE ta.setup_type = st.name
AND ta.setup_type_id IS NULL;

-- Note: After verifying migration, you can optionally drop the old columns:
-- ALTER TABLE trade_annotations DROP COLUMN IF EXISTS setup_type;
-- ALTER TABLE trade_annotations DROP COLUMN IF EXISTS setup_type_other;

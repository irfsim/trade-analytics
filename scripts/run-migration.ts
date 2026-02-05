/**
 * Check migration status and provide instructions
 * Usage: npx tsx scripts/run-migration.ts
 */

// Load .env.local FIRST before any other imports
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

// Now import supabase after env is loaded
import { createClient } from '@supabase/supabase-js';

async function checkMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Checking migration status...\n');

  // Check if trades table has market_condition column
  console.log('1. Checking trades.market_condition column...');
  const { data: tradeData, error: tradeError } = await supabase
    .from('trades')
    .select('id, market_condition')
    .limit(1);

  let needsTradesColumn = false;
  if (tradeError && tradeError.message.includes('market_condition')) {
    console.log('   ❌ Column does not exist - needs migration');
    needsTradesColumn = true;
  } else if (tradeError) {
    console.log(`   ⚠️  Error: ${tradeError.message}`);
  } else {
    console.log('   ✅ Column exists!');
  }

  // Check if qqq_market_data table exists
  console.log('\n2. Checking qqq_market_data table...');
  const { error: qqqError } = await supabase
    .from('qqq_market_data')
    .select('date')
    .limit(1);

  let needsQqqTable = false;
  if (qqqError && (qqqError.code === '42P01' || qqqError.message.includes('does not exist') || qqqError.message.includes('relation') || qqqError.message.includes('Could not find'))) {
    console.log('   ❌ Table does not exist - needs migration');
    needsQqqTable = true;
  } else if (qqqError) {
    console.log(`   ⚠️  Error: ${qqqError.message}`);
  } else {
    console.log('   ✅ Table exists!');
  }

  console.log('\n--- Status check complete ---\n');

  // If any missing, show SQL
  if (needsTradesColumn || needsQqqTable) {
    console.log('To run the migration, execute the following SQL in Supabase SQL Editor:\n');
    console.log('========================================');
    console.log(`
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

-- Add RLS policies
CREATE POLICY "Allow read access" ON qqq_market_data FOR SELECT USING (true);
CREATE POLICY "Allow insert" ON qqq_market_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update" ON qqq_market_data FOR UPDATE USING (true);
CREATE POLICY "Allow delete" ON qqq_market_data FOR DELETE USING (true);
`);
    console.log('========================================');

    // Extract project ID from URL
    const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
    if (match) {
      console.log(`\nOpen SQL Editor: https://supabase.com/dashboard/project/${match[1]}/sql/new`);
    }
  } else {
    console.log('✅ All migrations already applied!');
  }
}

checkMigration().catch(console.error);

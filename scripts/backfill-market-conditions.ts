/**
 * Backfill market conditions for existing trades
 *
 * Usage: npx tsx scripts/backfill-market-conditions.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import {
  getMarketConditionsForDates,
  dateKeyFromDatetime,
  type MarketCondition,
} from '../src/lib/market-condition';

async function backfillMarketConditions() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Backfilling market conditions for existing trades...\n');

  // Get all trades with NULL market_condition
  console.log('1. Fetching trades without market conditions...');
  const { data: trades, error: fetchError } = await supabase
    .from('trades')
    .select('id, entry_datetime, market_condition')
    .is('market_condition', null);

  if (fetchError) {
    console.error(`   Error: ${fetchError.message}`);
    process.exit(1);
  }

  if (!trades || trades.length === 0) {
    console.log('   No trades need backfilling.');
    return;
  }

  console.log(`   Found ${trades.length} trades to backfill.`);

  // Extract unique entry dates
  console.log('\n2. Extracting unique entry dates...');
  const entryDates = [...new Set(trades.map((t) => dateKeyFromDatetime(t.entry_datetime)))];
  console.log(`   ${entryDates.length} unique dates.`);

  // Fetch market conditions for all dates
  console.log('\n3. Fetching market conditions from Yahoo Finance...');
  let conditions: Map<string, MarketCondition>;
  try {
    conditions = await getMarketConditionsForDates(entryDates);
    console.log(`   Fetched conditions for ${conditions.size} dates.`);
  } catch (err) {
    console.error(`   Error fetching conditions: ${err}`);
    process.exit(1);
  }

  // Batch update trades
  console.log('\n4. Updating trades...');
  let updated = 0;
  let errors = 0;

  for (const trade of trades) {
    const dateKey = dateKeyFromDatetime(trade.entry_datetime);
    const condition = conditions.get(dateKey);

    if (!condition) {
      console.log(`   Skipping trade ${trade.id}: no condition for ${dateKey}`);
      continue;
    }

    const { error: updateError } = await supabase
      .from('trades')
      .update({ market_condition: condition })
      .eq('id', trade.id);

    if (updateError) {
      console.error(`   Error updating trade ${trade.id}: ${updateError.message}`);
      errors++;
    } else {
      updated++;
    }
  }

  console.log(`\n--- Backfill complete ---`);
  console.log(`   Updated: ${updated} trades`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Skipped: ${trades.length - updated - errors}`);
}

backfillMarketConditions().catch(console.error);

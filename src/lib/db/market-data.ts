/**
 * Database layer for QQQ market data cache
 */

import { createServerClient } from '../supabase';
import type { MarketCondition, QQQDayData } from '../market-condition';

export interface QQQMarketDataRow {
  date: string;
  close: number;
  high_20d: number | null;
  ma_10: number | null;
  ma_20: number | null;
  ma_50: number | null;
  ma_10_5d_ago: number | null;
  ma_20_5d_ago: number | null;
  market_condition: MarketCondition | null;
  cached_at: string;
}

/**
 * Get cached market conditions for a list of dates
 * Returns a map of date -> MarketCondition
 */
export async function getCachedMarketConditions(
  dates: string[]
): Promise<Map<string, MarketCondition>> {
  if (dates.length === 0) {
    return new Map();
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('qqq_market_data')
    .select('date, market_condition')
    .in('date', dates);

  if (error) {
    console.error('[Market Data] Failed to fetch cached conditions:', error.message);
    return new Map();
  }

  const result = new Map<string, MarketCondition>();
  for (const row of data || []) {
    if (row.market_condition) {
      result.set(row.date, row.market_condition as MarketCondition);
    }
  }

  return result;
}

/**
 * Find which dates don't have cached data
 */
export async function findUncachedDates(dates: string[]): Promise<string[]> {
  if (dates.length === 0) {
    return [];
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('qqq_market_data')
    .select('date')
    .in('date', dates);

  if (error) {
    console.error('[Market Data] Failed to check cached dates:', error.message);
    return dates; // Assume all uncached on error
  }

  const cachedDates = new Set((data || []).map((row) => row.date));
  return dates.filter((d) => !cachedDates.has(d));
}

/**
 * Cache market data for multiple days
 */
export async function cacheMarketData(
  dataMap: Map<string, QQQDayData>,
  conditions: Map<string, MarketCondition>
): Promise<{ inserted: number; errors: string[] }> {
  const supabase = createServerClient();
  const errors: string[] = [];
  let inserted = 0;

  const rows: Omit<QQQMarketDataRow, 'cached_at'>[] = [];

  for (const [date, dayData] of dataMap) {
    rows.push({
      date,
      close: dayData.close,
      high_20d: dayData.high20d,
      ma_10: dayData.ma10,
      ma_20: dayData.ma20,
      ma_50: dayData.ma50,
      ma_10_5d_ago: dayData.ma10_5dAgo,
      ma_20_5d_ago: dayData.ma20_5dAgo,
      market_condition: conditions.get(date) || null,
    });
  }

  if (rows.length === 0) {
    return { inserted: 0, errors: [] };
  }

  // Upsert to handle potential conflicts
  const { error } = await supabase
    .from('qqq_market_data')
    .upsert(rows, { onConflict: 'date' });

  if (error) {
    errors.push(`Failed to cache market data: ${error.message}`);
  } else {
    inserted = rows.length;
    console.log(`[Market Data] Cached ${inserted} days of QQQ data`);
  }

  return { inserted, errors };
}

/**
 * Get all cached market data for a date range
 */
export async function getCachedMarketDataRange(
  startDate: string,
  endDate: string
): Promise<QQQMarketDataRow[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('qqq_market_data')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (error) {
    console.error('[Market Data] Failed to fetch range:', error.message);
    return [];
  }

  return data || [];
}

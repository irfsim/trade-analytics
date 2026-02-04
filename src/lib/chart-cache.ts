import { createServerClient } from './supabase';
import type { ChartCandle } from '@/types/chart';

interface ChartCacheEntry {
  id: number;
  ticker: string;
  interval: '5m' | '1h';
  start_date: string;
  end_date: string;
  candles: ChartCandle[];
  cached_at: string;
}

// Padding for cached data (before entry, after exit)
const CACHE_PADDING = {
  '5m': { before: 24 * 60 * 60 * 1000, after: 2 * 60 * 60 * 1000 }, // 1 day before, 2 hours after
  '1h': { before: 2 * 24 * 60 * 60 * 1000, after: 2 * 24 * 60 * 60 * 1000 }, // 2 days each
};

/**
 * Fetch chart data from Yahoo Finance
 */
async function fetchFromYahoo(
  ticker: string,
  startDate: Date,
  endDate: Date,
  interval: '5m' | '1h'
): Promise<ChartCandle[]> {
  const period1 = Math.floor(startDate.getTime() / 1000);
  const period2 = Math.floor(endDate.getTime() / 1000);

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${period1}&period2=${period2}&interval=${interval}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    },
  });

  if (!response.ok) {
    throw new Error(`Yahoo Finance request failed: ${response.status}`);
  }

  const data = await response.json();
  const result = data.chart?.result?.[0];

  if (!result || !result.timestamp) {
    return [];
  }

  const timestamps: number[] = result.timestamp;
  const quote = result.indicators?.quote?.[0];

  if (!quote) {
    return [];
  }

  const candles: ChartCandle[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    const open = quote.open?.[i];
    const high = quote.high?.[i];
    const low = quote.low?.[i];
    const close = quote.close?.[i];
    const volume = quote.volume?.[i];

    // Skip if any OHLC data is missing
    if (open == null || high == null || low == null || close == null) {
      continue;
    }

    candles.push({
      time: new Date(timestamps[i] * 1000).toISOString(),
      open,
      high,
      low,
      close,
      volume: volume || 0,
    });
  }

  return candles;
}

/**
 * Cache chart data for a trade
 */
export async function cacheChartData(
  ticker: string,
  entryDate: Date,
  exitDate: Date,
  intervals: ('5m' | '1h')[] = ['5m', '1h']
): Promise<void> {
  const supabase = createServerClient();

  for (const interval of intervals) {
    const padding = CACHE_PADDING[interval];

    // Calculate padded date range
    const startDate = new Date(entryDate.getTime() - padding.before);
    const endDate = new Date(exitDate.getTime() + padding.after);

    // Check if already cached
    const { data: existing } = await supabase
      .from('chart_cache')
      .select('id')
      .eq('ticker', ticker)
      .eq('interval', interval)
      .eq('start_date', startDate.toISOString())
      .eq('end_date', endDate.toISOString())
      .single();

    if (existing) {
      console.log(`[Chart Cache] Already cached: ${ticker} ${interval}`);
      continue;
    }

    try {
      // Fetch from Yahoo Finance
      const candles = await fetchFromYahoo(ticker, startDate, endDate, interval);

      if (candles.length === 0) {
        console.log(`[Chart Cache] No data available: ${ticker} ${interval}`);
        continue;
      }

      // Store in database
      const { error } = await supabase.from('chart_cache').insert({
        ticker,
        interval,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        candles,
      });

      if (error) {
        console.error(`[Chart Cache] Failed to cache ${ticker} ${interval}:`, error.message);
      } else {
        console.log(`[Chart Cache] Cached ${ticker} ${interval}: ${candles.length} candles`);
      }
    } catch (err) {
      console.error(`[Chart Cache] Error fetching ${ticker} ${interval}:`, err);
    }
  }
}

/**
 * Cache chart data for multiple trades
 */
export async function cacheTradeChartData(
  trades: Array<{
    ticker: string;
    entry_datetime: string;
    exit_datetime: string | null;
    status: 'OPEN' | 'CLOSED';
  }>
): Promise<void> {
  // Only cache closed trades
  const closedTrades = trades.filter((t) => t.status === 'CLOSED' && t.exit_datetime);

  console.log(`[Chart Cache] Caching data for ${closedTrades.length} closed trades`);

  for (const trade of closedTrades) {
    await cacheChartData(
      trade.ticker,
      new Date(trade.entry_datetime),
      new Date(trade.exit_datetime!),
      ['5m', '1h']
    );
  }
}

/**
 * Get cached chart data
 */
export async function getCachedChartData(
  ticker: string,
  interval: '5m' | '1h',
  entryDate: Date,
  exitDate: Date
): Promise<{ candles: ChartCandle[]; cachedAt: string } | null> {
  const supabase = createServerClient();
  const padding = CACHE_PADDING[interval];

  // Calculate padded date range (same as when caching)
  const startDate = new Date(entryDate.getTime() - padding.before);
  const endDate = new Date(exitDate.getTime() + padding.after);

  const { data, error } = await supabase
    .from('chart_cache')
    .select('candles, cached_at')
    .eq('ticker', ticker)
    .eq('interval', interval)
    .eq('start_date', startDate.toISOString())
    .eq('end_date', endDate.toISOString())
    .single();

  if (error || !data) {
    return null;
  }

  return {
    candles: data.candles as ChartCandle[],
    cachedAt: data.cached_at,
  };
}

/**
 * Check if chart data is cached for a trade
 */
export async function isChartDataCached(
  ticker: string,
  interval: '5m' | '1h',
  entryDate: Date,
  exitDate: Date
): Promise<boolean> {
  const result = await getCachedChartData(ticker, interval, entryDate, exitDate);
  return result !== null;
}

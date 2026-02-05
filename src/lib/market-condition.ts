/**
 * Market condition detection based on QQQ moving averages
 *
 * Rules:
 * - CORRECTION: QQQ down >10% from 20-day high
 * - DOWNTREND: QQQ < 50MA, 20MA sloping down
 * - STRONG_UPTREND: close > 10MA > 20MA, both MAs sloping up
 * - SIDEWAYS: Between 20MA and 50MA, 20MA slope flat (<1%)
 * - UPTREND_CHOP: close > 20MA but not strong uptrend (default uptrend state)
 */

import type { MarketRegime } from '@/types/database';

// Re-export MarketRegime as MarketCondition for semantic clarity in this module
export type MarketCondition = MarketRegime;

export interface QQQDayData {
  date: string; // YYYY-MM-DD
  close: number;
  high20d: number | null;
  ma10: number | null;
  ma20: number | null;
  ma50: number | null;
  ma10_5dAgo: number | null;
  ma20_5dAgo: number | null;
}

/**
 * Detect market condition from QQQ data for a single day
 */
export function detectMarketCondition(data: QQQDayData): MarketCondition {
  const { close, high20d, ma10, ma20, ma50, ma10_5dAgo, ma20_5dAgo } = data;

  // If we don't have enough data, default to UPTREND_CHOP
  if (ma10 === null || ma20 === null || ma50 === null) {
    return 'UPTREND_CHOP';
  }

  // Calculate slopes (5-day change as percentage)
  const ma10Slope = ma10_5dAgo !== null ? ((ma10 - ma10_5dAgo) / ma10_5dAgo) * 100 : 0;
  const ma20Slope = ma20_5dAgo !== null ? ((ma20 - ma20_5dAgo) / ma20_5dAgo) * 100 : 0;

  // 1. CORRECTION: QQQ down >10% from 20-day high
  if (high20d !== null) {
    const drawdown = ((high20d - close) / high20d) * 100;
    if (drawdown > 10) {
      return 'CORRECTION';
    }
  }

  // 2. DOWNTREND: QQQ < 50MA AND 20MA sloping down
  if (close < ma50 && ma20Slope < -0.5) {
    return 'DOWNTREND';
  }

  // 3. STRONG_UPTREND: close > 10MA > 20MA, both MAs sloping up
  if (close > ma10 && ma10 > ma20 && ma10Slope > 0.3 && ma20Slope > 0.3) {
    return 'STRONG_UPTREND';
  }

  // 4. SIDEWAYS: Between 20MA and 50MA, 20MA slope flat (<1%)
  if (close >= ma50 && close <= ma20 * 1.02 && Math.abs(ma20Slope) < 1) {
    return 'SIDEWAYS';
  }

  // 5. UPTREND_CHOP: close > 20MA but not strong uptrend (default bullish state)
  if (close > ma20) {
    return 'UPTREND_CHOP';
  }

  // Below 20MA but above 50MA and not in downtrend
  if (close < ma20 && close > ma50) {
    return 'SIDEWAYS';
  }

  // Default fallback
  return 'UPTREND_CHOP';
}

interface YahooCandle {
  date: string;
  close: number;
  high: number;
}

/**
 * Fetch QQQ daily data from Yahoo Finance for a date range
 * Fetches extra days before to calculate MAs
 */
export async function fetchQQQDailyData(
  startDate: Date,
  endDate: Date
): Promise<YahooCandle[]> {
  // Fetch 60 extra days before start to calculate 50MA
  const fetchStart = new Date(startDate);
  fetchStart.setDate(fetchStart.getDate() - 80); // Extra buffer for weekends/holidays

  const period1 = Math.floor(fetchStart.getTime() / 1000);
  const period2 = Math.floor(endDate.getTime() / 1000) + 86400; // Include end day

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/QQQ?period1=${period1}&period2=${period2}&interval=1d`;

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

  const candles: YahooCandle[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    const close = quote.close?.[i];
    const high = quote.high?.[i];

    if (close == null || high == null) continue;

    const dateObj = new Date(timestamps[i] * 1000);
    const date = dateObj.toISOString().split('T')[0];

    candles.push({ date, close, high });
  }

  return candles;
}

/**
 * Calculate moving average from array of closes
 */
function calculateMA(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

/**
 * Calculate 20-day high from array of highs
 */
function calculate20DayHigh(highs: number[]): number | null {
  if (highs.length < 20) return null;
  return Math.max(...highs.slice(-20));
}

/**
 * Process raw candles into QQQDayData with MAs calculated
 */
export function processQQQCandles(candles: YahooCandle[]): Map<string, QQQDayData> {
  const result = new Map<string, QQQDayData>();

  for (let i = 0; i < candles.length; i++) {
    const { date, close } = candles[i];

    // Get historical closes and highs up to this point
    const historicalCloses = candles.slice(0, i + 1).map((c) => c.close);
    const historicalHighs = candles.slice(0, i + 1).map((c) => c.high);

    // Get closes from 5 days ago for slope calculation
    const closes5dAgo = i >= 5 ? candles.slice(0, i - 4).map((c) => c.close) : [];

    const dayData: QQQDayData = {
      date,
      close,
      high20d: calculate20DayHigh(historicalHighs),
      ma10: calculateMA(historicalCloses, 10),
      ma20: calculateMA(historicalCloses, 20),
      ma50: calculateMA(historicalCloses, 50),
      ma10_5dAgo: closes5dAgo.length >= 10 ? calculateMA(closes5dAgo, 10) : null,
      ma20_5dAgo: closes5dAgo.length >= 20 ? calculateMA(closes5dAgo, 20) : null,
    };

    result.set(date, dayData);
  }

  return result;
}

/**
 * Get market conditions for a list of dates
 * Checks cache first, fetches from Yahoo if needed
 */
export async function getMarketConditionsForDates(
  dates: string[]
): Promise<Map<string, MarketCondition>> {
  if (dates.length === 0) {
    return new Map();
  }

  // Dynamically import to avoid circular dependency
  const { getCachedMarketConditions, findUncachedDates, cacheMarketData } = await import(
    './db/market-data'
  );

  // Check cache first
  const cachedConditions = await getCachedMarketConditions(dates);

  // Find which dates need fetching
  const uncachedDates = await findUncachedDates(dates);

  if (uncachedDates.length === 0) {
    return cachedConditions;
  }

  console.log(`[Market Condition] Fetching ${uncachedDates.length} uncached dates`);

  // Sort dates to find range
  const sortedDates = [...uncachedDates].sort();
  const startDate = new Date(sortedDates[0]);
  const endDate = new Date(sortedDates[sortedDates.length - 1]);

  // Fetch QQQ data
  const candles = await fetchQQQDailyData(startDate, endDate);

  if (candles.length === 0) {
    console.warn('[Market Condition] No QQQ data available');
    return cachedConditions;
  }

  // Process candles to get MA data
  const dayDataMap = processQQQCandles(candles);

  // Calculate conditions for requested dates
  const newConditions = new Map<string, MarketCondition>();

  for (const date of uncachedDates) {
    const dayData = dayDataMap.get(date);

    if (dayData) {
      newConditions.set(date, detectMarketCondition(dayData));
    } else {
      // Find closest previous trading day (weekend/holiday fallback)
      const sortedKeys = [...dayDataMap.keys()].sort();
      const prevDay = sortedKeys.filter((d) => d <= date).pop();

      if (prevDay) {
        const prevData = dayDataMap.get(prevDay)!;
        newConditions.set(date, detectMarketCondition(prevData));
        // Note: We intentionally don't cache fallback data for non-trading days
        // to avoid storing data with incorrect dates
      } else {
        newConditions.set(date, 'UPTREND_CHOP'); // Default fallback
      }
    }
  }

  // Cache only actual trading day data (not weekend/holiday fallbacks)
  const tradingDayData = new Map<string, QQQDayData>();
  const tradingDayConditions = new Map<string, MarketCondition>();
  for (const [date, data] of dayDataMap) {
    if (newConditions.has(date) && dayDataMap.get(date)?.date === date) {
      tradingDayData.set(date, data);
      const condition = newConditions.get(date);
      if (condition) {
        tradingDayConditions.set(date, condition);
      }
    }
  }
  await cacheMarketData(tradingDayData, tradingDayConditions);

  // Merge cached and new conditions
  const allConditions = new Map([...cachedConditions, ...newConditions]);

  return allConditions;
}

/**
 * Convert datetime to date key for lookup
 */
export function dateKeyFromDatetime(datetime: string): string {
  return datetime.split('T')[0];
}

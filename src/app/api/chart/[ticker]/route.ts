import { NextRequest, NextResponse } from 'next/server';
import type { ChartCandle, ChartInterval } from '@/types/chart';

const INTERVAL_CONFIG: Record<ChartInterval, { yahooInterval: string; paddingDays: number }> = {
  '5m': { yahooInterval: '5m', paddingDays: 1 },
  '1h': { yahooInterval: '1h', paddingDays: 5 },
  '1d': { yahooInterval: '1d', paddingDays: 30 },
};

interface YahooChartResponse {
  chart: {
    result: Array<{
      timestamp: number[];
      meta: {
        currency: string;
        exchangeName: string;
        regularMarketPrice: number;
      };
      indicators: {
        quote: Array<{
          open: (number | null)[];
          high: (number | null)[];
          low: (number | null)[];
          close: (number | null)[];
          volume: (number | null)[];
        }>;
      };
    }> | null;
    error: { code: string; description: string } | null;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const searchParams = request.nextUrl.searchParams;

  const interval = (searchParams.get('interval') || '1d') as ChartInterval;
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  // Validate interval
  if (!(interval in INTERVAL_CONFIG)) {
    return NextResponse.json({ error: 'Invalid interval. Use: 1d, 1h, or 5m' }, { status: 400 });
  }

  const config = INTERVAL_CONFIG[interval];

  // Calculate date range with padding
  const entryDate = from ? new Date(from) : new Date();
  const exitDate = to ? new Date(to) : new Date();

  const paddingMs = config.paddingDays * 24 * 60 * 60 * 1000;
  const startDate = new Date(entryDate.getTime() - paddingMs);
  const endDate = new Date(Math.max(exitDate.getTime() + paddingMs, Date.now()));

  // Build Yahoo Finance URL
  const yahooUrl = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker.toUpperCase()}`);
  yahooUrl.searchParams.set('period1', String(Math.floor(startDate.getTime() / 1000)));
  yahooUrl.searchParams.set('period2', String(Math.floor(endDate.getTime() / 1000)));
  yahooUrl.searchParams.set('interval', config.yahooInterval);
  yahooUrl.searchParams.set('includePrePost', 'false');

  try {
    const response = await fetch(yahooUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance returned ${response.status}`);
    }

    const data: YahooChartResponse = await response.json();

    if (data.chart.error) {
      return NextResponse.json(
        { error: data.chart.error.description },
        { status: 400 }
      );
    }

    const result = data.chart.result?.[0];
    if (!result || !result.timestamp) {
      return NextResponse.json({ error: 'No data found for ticker' }, { status: 404 });
    }

    // Transform to standardized format
    const { timestamp, indicators, meta } = result;
    const quote = indicators.quote[0];

    const candles: ChartCandle[] = [];
    for (let i = 0; i < timestamp.length; i++) {
      // Skip null values (market closed, etc.)
      if (
        quote.open[i] === null ||
        quote.high[i] === null ||
        quote.low[i] === null ||
        quote.close[i] === null
      ) {
        continue;
      }

      // Format time based on interval
      // Daily: 'YYYY-MM-DD' string
      // Intraday: Unix timestamp number (as string for JSON)
      const date = new Date(timestamp[i] * 1000);
      const time =
        interval === '1d'
          ? date.toISOString().split('T')[0]
          : String(timestamp[i]);

      candles.push({
        time,
        open: quote.open[i]!,
        high: quote.high[i]!,
        low: quote.low[i]!,
        close: quote.close[i]!,
        volume: quote.volume[i] || 0,
      });
    }

    return NextResponse.json({
      ticker: ticker.toUpperCase(),
      interval,
      candles,
      meta: {
        currency: meta?.currency || 'USD',
        exchangeName: meta?.exchangeName || '',
        regularMarketPrice: meta?.regularMarketPrice,
      },
    });
  } catch (error) {
    console.error('Chart API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch chart data',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

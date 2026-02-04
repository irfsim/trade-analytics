import { NextRequest, NextResponse } from 'next/server';
import { getCachedChartData } from '@/lib/chart-cache';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const ticker = searchParams.get('ticker');
  const interval = searchParams.get('interval') as '5m' | '1h' | null;
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!ticker || !interval || !from || !to) {
    return NextResponse.json(
      { error: 'Missing required parameters: ticker, interval, from, to' },
      { status: 400 }
    );
  }

  if (interval !== '5m' && interval !== '1h') {
    return NextResponse.json(
      { error: 'Invalid interval. Must be "5m" or "1h"' },
      { status: 400 }
    );
  }

  try {
    const entryDate = new Date(from);
    const exitDate = new Date(to);

    const cached = await getCachedChartData(ticker, interval, entryDate, exitDate);

    if (!cached) {
      return NextResponse.json(
        {
          ticker,
          interval,
          cached: false,
          candles: [],
          message: 'No cached data available for this trade period',
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      ticker,
      interval,
      cached: true,
      cachedAt: cached.cachedAt,
      candles: cached.candles,
    });
  } catch (error) {
    console.error('[Chart Data API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chart data' },
      { status: 500 }
    );
  }
}

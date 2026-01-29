import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  calculatePerformanceMetrics,
  buildEquityCurve,
  calculateSegmentedMetrics,
  calculateRuleAdherenceStats,
  getPnlDistribution,
} from '@/lib/analytics';
import type { Trade, TradeAnnotation } from '@/types/database';

interface TradeWithAnnotation extends Trade {
  annotation?: TradeAnnotation | null;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const accountId = searchParams.get('accountId') || undefined;
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;
    const segmentBy = searchParams.get('segmentBy') as 'setup_type' | 'market_regime' | 'grade' | undefined;
    const planOnly = searchParams.get('planOnly') === 'true';

    // Build query
    let query = supabase
      .from('trades')
      .select(`
        *,
        trade_annotations (*)
      `)
      .eq('status', 'CLOSED');

    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    if (from) {
      query = query.gte('entry_datetime', from);
    }

    if (to) {
      query = query.lte('entry_datetime', to);
    }

    query = query.order('entry_datetime', { ascending: true });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch trades: ${error.message}`);
    }

    // Transform data - handle the joined annotation
    const allTrades: TradeWithAnnotation[] = (data || []).map((row) => ({
      ...row,
      annotation: row.trade_annotations?.[0] || null,
      trade_annotations: undefined,
    }));

    // Filter by plan compliance if requested
    const trades = planOnly
      ? allTrades.filter((t) => t.annotation?.followed_plan === true)
      : allTrades;

    const totalTradeCount = allTrades.length;
    const filteredTradeCount = trades.length;

    // Calculate overall metrics
    const metrics = calculatePerformanceMetrics(trades);

    // Build equity curve
    const equityCurve = buildEquityCurve(trades);

    // Calculate segmented metrics if requested
    let segmentedMetrics: Record<string, ReturnType<typeof calculatePerformanceMetrics>> | null = null;
    if (segmentBy) {
      segmentedMetrics = calculateSegmentedMetrics(trades, segmentBy);
    }

    // Rule adherence stats
    const ruleAdherence = calculateRuleAdherenceStats(trades);

    // P&L distribution
    const pnlDistribution = getPnlDistribution(trades);

    return NextResponse.json({
      metrics,
      equityCurve: equityCurve.map((point) => ({
        date: point.date,
        equity: point.equity,
      })),
      segmentedMetrics,
      ruleAdherence,
      pnlDistribution,
      tradeCount: trades.length,
      totalTradeCount,
      filteredTradeCount,
    });
  } catch (error) {
    console.error('Error calculating stats:', error);
    return NextResponse.json(
      { error: 'Failed to calculate stats', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

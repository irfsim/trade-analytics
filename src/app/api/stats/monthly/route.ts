import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export interface MonthlyStats {
  month: number;
  year: number;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  avgWin: number;
  avgLoss: number;
  avgWinPct: number;
  avgLossPct: number;
  profitFactor: number;
  bestTrade: number;
  worstTrade: number;
  bestTradePct: number;
  worstTradePct: number;
  maxConsecWins: number;
  maxConsecLosses: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
  const accountId = searchParams.get('accountId');
  const planOnly = searchParams.get('planOnly') === 'true';

  // Get all trades for the specified year with annotations
  let query = supabase
    .from('trades')
    .select('*, trade_annotations(followed_plan)')
    .gte('entry_datetime', `${year}-01-01`)
    .lt('entry_datetime', `${year + 1}-01-01`)
    .order('entry_datetime', { ascending: true });

  if (accountId) {
    query = query.eq('account_id', accountId);
  }

  const { data: allTrades, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Filter by plan compliance if requested
  const trades = planOnly
    ? (allTrades || []).filter((t: { trade_annotations?: { followed_plan?: boolean }[] }) =>
        t.trade_annotations?.[0]?.followed_plan === true
      )
    : allTrades || [];

  const totalTradeCount = (allTrades || []).length;

  // Group trades by month and calculate stats
  const monthlyData: Map<number, {
    trades: number;
    wins: number;
    losses: number;
    totalPnl: number;
    winningPnls: number[];
    losingPnls: number[];
    allPnls: number[];
    winningPcts: number[];
    losingPcts: number[];
    allPcts: number[];
    tradeResults: ('W' | 'L' | 'B')[]; // W=win, L=loss, B=breakeven
  }> = new Map();

  // Initialize all 12 months
  for (let i = 1; i <= 12; i++) {
    monthlyData.set(i, {
      trades: 0,
      wins: 0,
      losses: 0,
      totalPnl: 0,
      winningPnls: [],
      losingPnls: [],
      allPnls: [],
      winningPcts: [],
      losingPcts: [],
      allPcts: [],
      tradeResults: [],
    });
  }

  // Process each trade (already sorted by entry_datetime ascending)
  for (const trade of trades || []) {
    const month = new Date(trade.entry_datetime).getMonth() + 1; // 1-12
    const pnl = trade.realized_pnl || 0;
    const data = monthlyData.get(month)!;

    // Calculate percentage return if we have entry price and shares
    const entryValue = (trade.entry_price || 0) * (trade.total_shares || 0);
    const pctReturn = entryValue > 0 ? (pnl / entryValue) * 100 : 0;

    data.trades++;
    data.totalPnl += pnl;
    data.allPnls.push(pnl);
    data.allPcts.push(pctReturn);

    if (pnl > 0) {
      data.wins++;
      data.winningPnls.push(pnl);
      data.winningPcts.push(pctReturn);
      data.tradeResults.push('W');
    } else if (pnl < 0) {
      data.losses++;
      data.losingPnls.push(pnl);
      data.losingPcts.push(pctReturn);
      data.tradeResults.push('L');
    } else {
      data.tradeResults.push('B');
    }
  }

  // Helper function to calculate max consecutive streak
  function maxConsecutive(results: ('W' | 'L' | 'B')[], target: 'W' | 'L'): number {
    let max = 0;
    let current = 0;
    for (const r of results) {
      if (r === target) {
        current++;
        max = Math.max(max, current);
      } else {
        current = 0;
      }
    }
    return max;
  }

  // Calculate final stats for each month
  const monthlyStats: MonthlyStats[] = [];

  for (let month = 1; month <= 12; month++) {
    const data = monthlyData.get(month)!;

    const winRate = data.trades > 0
      ? Math.round((data.wins / data.trades) * 100 * 10) / 10
      : 0;

    const avgPnl = data.trades > 0
      ? data.totalPnl / data.trades
      : 0;

    const avgWin = data.winningPnls.length > 0
      ? data.winningPnls.reduce((a, b) => a + b, 0) / data.winningPnls.length
      : 0;

    const avgLoss = data.losingPnls.length > 0
      ? data.losingPnls.reduce((a, b) => a + b, 0) / data.losingPnls.length
      : 0;

    const avgWinPct = data.winningPcts.length > 0
      ? data.winningPcts.reduce((a, b) => a + b, 0) / data.winningPcts.length
      : 0;

    const avgLossPct = data.losingPcts.length > 0
      ? data.losingPcts.reduce((a, b) => a + b, 0) / data.losingPcts.length
      : 0;

    // Profit factor = gross profit / gross loss (absolute value)
    const grossProfit = data.winningPnls.reduce((a, b) => a + b, 0);
    const grossLoss = Math.abs(data.losingPnls.reduce((a, b) => a + b, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    const bestTrade = data.allPnls.length > 0
      ? Math.max(...data.allPnls)
      : 0;

    const worstTrade = data.allPnls.length > 0
      ? Math.min(...data.allPnls)
      : 0;

    const bestTradePct = data.allPcts.length > 0
      ? Math.max(...data.allPcts)
      : 0;

    const worstTradePct = data.allPcts.length > 0
      ? Math.min(...data.allPcts)
      : 0;

    monthlyStats.push({
      month,
      year,
      trades: data.trades,
      wins: data.wins,
      losses: data.losses,
      winRate,
      totalPnl: data.totalPnl,
      avgPnl,
      avgWin,
      avgLoss,
      avgWinPct,
      avgLossPct,
      profitFactor: profitFactor === Infinity ? 999 : profitFactor,
      bestTrade,
      worstTrade,
      bestTradePct,
      worstTradePct,
      maxConsecWins: maxConsecutive(data.tradeResults, 'W'),
      maxConsecLosses: maxConsecutive(data.tradeResults, 'L'),
    });
  }

  // Calculate year summary (using filtered trades)
  const filteredTradeCount = trades.length;
  const totalWins = trades.filter((t: { realized_pnl?: number }) => (t.realized_pnl || 0) > 0).length;
  const totalPnl = trades.reduce((sum: number, t: { realized_pnl?: number }) => sum + (t.realized_pnl || 0), 0);
  const yearPnls = trades.map((t: { realized_pnl?: number }) => t.realized_pnl || 0);

  const yearSummary = {
    totalTrades: filteredTradeCount,
    winRate: filteredTradeCount > 0 ? Math.round((totalWins / filteredTradeCount) * 100 * 10) / 10 : 0,
    totalPnl,
    bestTrade: yearPnls.length > 0 ? Math.max(...yearPnls) : 0,
    worstTrade: yearPnls.length > 0 ? Math.min(...yearPnls) : 0,
  };

  return NextResponse.json({
    year,
    summary: yearSummary,
    months: monthlyStats,
    totalTradeCount,
    filteredTradeCount,
  });
}

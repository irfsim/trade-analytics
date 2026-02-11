import { NextRequest, NextResponse } from 'next/server';
import {
  getTrades,
  getTradesNeedingAnnotation,
  TradeWithRating,
  getAllClosedTradesForBalance,
  getAccountsWithBalances,
  getCashFlowsForBalance,
  calculateTradePercentages,
} from '@/lib/db/trades';
import { isSupabaseConfigured, getDummyTrades } from '@/lib/dummy-data';

// Calculate stats from trades array
function calculateInlineStats(trades: TradeWithRating[]) {
  const closedTrades = trades.filter(t => t.status === 'CLOSED');

  if (closedTrades.length === 0) {
    return {
      netPnl: 0,
      winRate: 0,
      totalTrades: 0,
      winners: 0,
      losers: 0,
      avgSetupRating: null,
      planAdherence: null,
      avgWin: null,
      avgWinPct: null,
      avgLoss: null,
      avgLossPct: null,
    };
  }

  const winners = closedTrades.filter(t => t.realized_pnl !== null && t.realized_pnl > 0);
  const losers = closedTrades.filter(t => t.realized_pnl !== null && t.realized_pnl < 0);

  const netPnl = closedTrades.reduce((sum, t) => sum + (t.realized_pnl || 0), 0);
  const winRate = closedTrades.length > 0 ? Math.round((winners.length / closedTrades.length) * 100) : 0;

  // Calculate average setup rating (only for trades with ratings)
  const tradesWithRating = closedTrades.filter(t => t.setup_rating !== null);
  const avgSetupRating = tradesWithRating.length > 0
    ? Math.round((tradesWithRating.reduce((sum, t) => sum + (t.setup_rating || 0), 0) / tradesWithRating.length) * 10) / 10
    : null;

  // Calculate plan adherence (only for trades with plan data)
  const tradesWithPlanData = closedTrades.filter(t => t.followed_plan !== null);
  const tradesFollowedPlan = tradesWithPlanData.filter(t => t.followed_plan === true);
  const planAdherence = tradesWithPlanData.length > 0
    ? Math.round((tradesFollowedPlan.length / tradesWithPlanData.length) * 100)
    : null;

  // Calculate average win (dollars and %)
  const avgWin = winners.length > 0
    ? Math.round(winners.reduce((sum, t) => sum + (t.realized_pnl || 0), 0) / winners.length)
    : null;
  const avgWinPct = winners.length > 0
    ? Math.round((winners.reduce((sum, t) => {
        if (t.entry_price && t.exit_price) {
          return sum + ((t.exit_price - t.entry_price) / t.entry_price) * 100;
        }
        return sum;
      }, 0) / winners.length) * 10) / 10
    : null;

  // Calculate average loss (dollars and %)
  const avgLoss = losers.length > 0
    ? Math.round(losers.reduce((sum, t) => sum + (t.realized_pnl || 0), 0) / losers.length)
    : null;
  const avgLossPct = losers.length > 0
    ? Math.round((losers.reduce((sum, t) => {
        if (t.entry_price && t.exit_price) {
          return sum + ((t.exit_price - t.entry_price) / t.entry_price) * 100;
        }
        return sum;
      }, 0) / losers.length) * 10) / 10
    : null;

  return {
    netPnl: Math.round(netPnl * 100) / 100,
    winRate,
    totalTrades: closedTrades.length,
    winners: winners.length,
    losers: losers.length,
    avgSetupRating,
    planAdherence,
    avgWin,
    avgWinPct,
    avgLoss,
    avgLossPct,
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const accountId = searchParams.get('accountId') || undefined;
    const status = searchParams.get('status') as 'OPEN' | 'CLOSED' | undefined;
    const ticker = searchParams.get('ticker') || undefined;
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;
    const needsAnnotation = searchParams.get('needsAnnotation') === 'true';
    const includeStats = searchParams.get('includeStats') === 'true';

    if (!isSupabaseConfigured()) {
      const trades = getDummyTrades({ accountId, from, to, limit, offset });
      if (includeStats) {
        const stats = calculateInlineStats(trades);
        return NextResponse.json({ trades, stats });
      }
      return NextResponse.json({ trades });
    }

    if (needsAnnotation) {
      const trades = await getTradesNeedingAnnotation(accountId, limit);
      return NextResponse.json({ trades });
    }

    // Fetch trades and data needed for account_pct calculation in parallel
    const [trades, allClosedTrades, accounts, cashFlows] = await Promise.all([
      getTrades({
        accountId,
        status,
        ticker,
        from,
        to,
        limit,
        offset,
      }),
      getAllClosedTradesForBalance(accountId),
      getAccountsWithBalances(accountId),
      getCashFlowsForBalance(accountId),
    ]);

    // Calculate trade percentages
    const pctMap = calculateTradePercentages(
      trades,
      allClosedTrades,
      accounts,
      cashFlows,
      accountId
    );

    // Add percentages to each trade
    const tradesWithPct = trades.map(trade => {
      const pcts = pctMap.get(trade.id);
      return {
        ...trade,
        account_pct: pcts?.account_pct ?? null,
        position_size_pct: pcts?.position_size_pct ?? null,
      };
    });

    // Include stats if requested
    if (includeStats) {
      const stats = calculateInlineStats(tradesWithPct);
      return NextResponse.json({ trades: tradesWithPct, stats });
    }

    return NextResponse.json({ trades: tradesWithPct });
  } catch (error) {
    console.error('Error fetching trades:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trades', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

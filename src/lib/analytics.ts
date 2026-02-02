import type { Trade, TradeAnnotation, PerformanceMetrics, APlusChecklist } from '@/types/database';

interface AnnotationWithSetupName extends TradeAnnotation {
  setup_type_name?: string | null;
}

interface TradeWithAnnotation extends Trade {
  annotation?: AnnotationWithSetupName | null;
}

/**
 * Calculate R-multiple for a trade
 */
export function calculateRMultiple(
  realizedPnl: number | null,
  initialRiskDollars: number | null
): number | null {
  if (realizedPnl === null || !initialRiskDollars || initialRiskDollars <= 0) {
    return null;
  }
  return Math.round((realizedPnl / initialRiskDollars) * 100) / 100;
}

/**
 * Calculate performance metrics from a list of trades
 */
export function calculatePerformanceMetrics(trades: TradeWithAnnotation[]): PerformanceMetrics {
  const closedTrades = trades.filter((t) => t.status === 'CLOSED' && t.realized_pnl !== null);

  if (closedTrades.length === 0) {
    return {
      totalTrades: 0,
      winners: 0,
      losers: 0,
      breakeven: 0,
      winRate: 0,
      averageWin: 0,
      averageLoss: 0,
      averageR: null,
      expectancy: 0,
      expectancyR: null,
      profitFactor: 0,
      grossPnl: 0,
      totalCommission: 0,
      netPnl: 0,
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
    };
  }

  // Categorize trades
  const winners = closedTrades.filter((t) => t.realized_pnl! > 0);
  const losers = closedTrades.filter((t) => t.realized_pnl! < 0);
  const breakeven = closedTrades.filter((t) => t.realized_pnl === 0);

  // Basic stats
  const totalTrades = closedTrades.length;
  const winRate = winners.length / totalTrades;

  // P&L calculations
  const grossWins = winners.reduce((sum, t) => sum + t.realized_pnl!, 0);
  const grossLosses = Math.abs(losers.reduce((sum, t) => sum + t.realized_pnl!, 0));
  const grossPnl = closedTrades.reduce((sum, t) => sum + t.realized_pnl!, 0);
  const totalCommission = closedTrades.reduce((sum, t) => sum + t.total_commission, 0);
  const netPnl = grossPnl; // Commission already included in realized_pnl

  // Averages
  const averageWin = winners.length > 0 ? grossWins / winners.length : 0;
  const averageLoss = losers.length > 0 ? grossLosses / losers.length : 0;

  // Expectancy
  const lossRate = losers.length / totalTrades;
  const expectancy = winRate * averageWin - lossRate * averageLoss;

  // Profit factor
  const profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? Infinity : 0;

  // R-multiple calculations (only for trades with initial risk)
  const tradesWithR = closedTrades.filter(
    (t) => t.annotation?.initial_risk_dollars && t.annotation.initial_risk_dollars > 0
  );

  let averageR: number | null = null;
  let expectancyR: number | null = null;

  if (tradesWithR.length > 0) {
    const rValues = tradesWithR.map((t) =>
      calculateRMultiple(t.realized_pnl, t.annotation!.initial_risk_dollars)!
    );
    averageR = rValues.reduce((sum, r) => sum + r, 0) / rValues.length;
    averageR = Math.round(averageR * 100) / 100;

    const winnersWithR = rValues.filter((r) => r > 0);
    const losersWithR = rValues.filter((r) => r < 0);

    if (winnersWithR.length > 0 && losersWithR.length > 0) {
      const avgWinR = winnersWithR.reduce((sum, r) => sum + r, 0) / winnersWithR.length;
      const avgLossR = Math.abs(losersWithR.reduce((sum, r) => sum + r, 0)) / losersWithR.length;
      const winRateR = winnersWithR.length / rValues.length;
      const lossRateR = losersWithR.length / rValues.length;
      expectancyR = Math.round((winRateR * avgWinR - lossRateR * avgLossR) * 100) / 100;
    }
  }

  // Drawdown calculation
  const { maxDrawdown, maxDrawdownPercent } = calculateDrawdown(closedTrades);

  return {
    totalTrades,
    winners: winners.length,
    losers: losers.length,
    breakeven: breakeven.length,
    winRate: Math.round(winRate * 1000) / 10, // As percentage
    averageWin: Math.round(averageWin * 100) / 100,
    averageLoss: Math.round(averageLoss * 100) / 100,
    averageR,
    expectancy: Math.round(expectancy * 100) / 100,
    expectancyR,
    profitFactor: Math.round(profitFactor * 100) / 100,
    grossPnl: Math.round(grossPnl * 100) / 100,
    totalCommission: Math.round(totalCommission * 100) / 100,
    netPnl: Math.round(netPnl * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    maxDrawdownPercent: Math.round(maxDrawdownPercent * 100) / 100,
  };
}

/**
 * Calculate max drawdown from equity curve
 */
function calculateDrawdown(trades: Trade[]): { maxDrawdown: number; maxDrawdownPercent: number } {
  if (trades.length === 0) {
    return { maxDrawdown: 0, maxDrawdownPercent: 0 };
  }

  // Sort by exit datetime
  const sorted = [...trades]
    .filter((t) => t.exit_datetime)
    .sort((a, b) => new Date(a.exit_datetime!).getTime() - new Date(b.exit_datetime!).getTime());

  if (sorted.length === 0) {
    return { maxDrawdown: 0, maxDrawdownPercent: 0 };
  }

  // Build cumulative equity
  let cumulative = 0;
  let peak = 0;
  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;

  for (const trade of sorted) {
    cumulative += trade.realized_pnl || 0;

    if (cumulative > peak) {
      peak = cumulative;
    }

    const drawdown = peak - cumulative;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      maxDrawdownPercent = peak > 0 ? (drawdown / peak) * 100 : 0;
    }
  }

  return { maxDrawdown, maxDrawdownPercent };
}

/**
 * Build equity curve data points
 */
export function buildEquityCurve(
  trades: Trade[]
): { date: string; equity: number; trade: Trade }[] {
  const sorted = [...trades]
    .filter((t) => t.exit_datetime && t.status === 'CLOSED')
    .sort((a, b) => new Date(a.exit_datetime!).getTime() - new Date(b.exit_datetime!).getTime());

  let cumulative = 0;
  return sorted.map((trade) => {
    cumulative += trade.realized_pnl || 0;
    return {
      date: trade.exit_datetime!,
      equity: Math.round(cumulative * 100) / 100,
      trade,
    };
  });
}

/**
 * Calculate metrics segmented by a field
 */
export function calculateSegmentedMetrics(
  trades: TradeWithAnnotation[],
  segmentBy: 'setup_type' | 'market_regime' | 'grade'
): Record<string, PerformanceMetrics> {
  const segments: Record<string, TradeWithAnnotation[]> = {};

  for (const trade of trades) {
    let value: string;
    if (segmentBy === 'setup_type') {
      value = trade.annotation?.setup_type_name || 'Unknown';
    } else {
      value = trade.annotation?.[segmentBy] || 'Unknown';
    }
    if (!segments[value]) {
      segments[value] = [];
    }
    segments[value].push(trade);
  }

  const result: Record<string, PerformanceMetrics> = {};
  for (const [key, segmentTrades] of Object.entries(segments)) {
    result[key] = calculatePerformanceMetrics(segmentTrades);
  }

  return result;
}

/**
 * Calculate win rate by rule adherence
 */
export function calculateRuleAdherenceStats(
  trades: TradeWithAnnotation[]
): { followed: PerformanceMetrics; broken: PerformanceMetrics } {
  const followed = trades.filter((t) => t.annotation?.should_have_taken === true);
  const broken = trades.filter((t) => t.annotation?.should_have_taken === false);

  return {
    followed: calculatePerformanceMetrics(followed),
    broken: calculatePerformanceMetrics(broken),
  };
}

/**
 * Get distribution of P&L
 */
export function getPnlDistribution(
  trades: Trade[],
  bucketSize: number = 100
): { bucket: string; count: number; totalPnl: number }[] {
  const closedTrades = trades.filter((t) => t.status === 'CLOSED' && t.realized_pnl !== null);

  if (closedTrades.length === 0) {
    return [];
  }

  const buckets: Record<string, { count: number; totalPnl: number }> = {};

  for (const trade of closedTrades) {
    const pnl = trade.realized_pnl!;
    const bucketIndex = Math.floor(pnl / bucketSize);
    const bucketKey =
      bucketIndex >= 0
        ? `$${bucketIndex * bucketSize} to $${(bucketIndex + 1) * bucketSize}`
        : `-$${Math.abs((bucketIndex + 1) * bucketSize)} to -$${Math.abs(bucketIndex * bucketSize)}`;

    if (!buckets[bucketKey]) {
      buckets[bucketKey] = { count: 0, totalPnl: 0 };
    }
    buckets[bucketKey].count++;
    buckets[bucketKey].totalPnl += pnl;
  }

  return Object.entries(buckets)
    .map(([bucket, data]) => ({
      bucket,
      count: data.count,
      totalPnl: Math.round(data.totalPnl * 100) / 100,
    }))
    .sort((a, b) => {
      // Sort by bucket value
      const aVal = parseInt(a.bucket.replace(/[^-\d]/g, ''));
      const bVal = parseInt(b.bucket.replace(/[^-\d]/g, ''));
      return aVal - bVal;
    });
}

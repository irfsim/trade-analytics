import type { Execution, Trade, TradeLeg } from '@/types/database';

/**
 * Entry lot for FIFO matching
 */
interface EntryLot {
  executionId: string;
  shares: number;
  price: number;
  timestamp: Date;
  remainingShares: number;
}

/**
 * Intermediate trade being built
 */
interface OpenTrade {
  accountId: string;
  ticker: string;
  direction: 'LONG' | 'SHORT';
  entryLots: EntryLot[];
  legs: TradeLegInput[];
  totalEntryShares: number;
  totalEntryCost: number;
  totalExitShares: number;
  totalExitProceeds: number;
  totalCommission: number;
  entryDatetime: Date;
  lastExitDatetime: Date | null;
}

/**
 * Input for creating a trade leg
 */
interface TradeLegInput {
  executionId: string;
  legType: 'ENTRY' | 'ADD' | 'TRIM' | 'EXIT';
  shares: number;
  price: number;
  executedAt: Date;
}

/**
 * Output: completed trade ready for database insert
 */
export interface MatchedTrade {
  accountId: string;
  ticker: string;
  direction: 'LONG' | 'SHORT';
  status: 'OPEN' | 'CLOSED';
  entryDatetime: Date;
  exitDatetime: Date | null;
  entryPrice: number; // Weighted average
  exitPrice: number | null; // Weighted average
  totalShares: number;
  remainingShares: number;
  realizedPnl: number | null;
  totalCommission: number;
  legs: TradeLegInput[];
}

/**
 * Result of trade matching
 */
export interface MatchResult {
  trades: MatchedTrade[];
  unmatchedExecutions: Execution[];
  errors: string[];
}

/**
 * Match executions into trades using FIFO method
 *
 * Rules:
 * - Executions are processed in chronological order
 * - For LONG: BUY opens/adds, SELL trims/closes
 * - For SHORT: SELL opens/adds, BUY covers
 * - Position going to zero closes the trade
 * - New same-direction execution after flat = new trade
 */
export function matchExecutionsToTrades(executions: Execution[]): MatchResult {
  const errors: string[] = [];
  const completedTrades: MatchedTrade[] = [];
  const unmatchedExecutions: Execution[] = [];

  // Sort by execution time
  const sorted = [...executions].sort(
    (a, b) => new Date(a.executed_at).getTime() - new Date(b.executed_at).getTime()
  );

  // Group by account + ticker
  const groups = new Map<string, Execution[]>();
  for (const exec of sorted) {
    const key = `${exec.account_id}:${exec.ticker}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(exec);
  }

  // Process each group
  for (const [key, groupExecutions] of groups) {
    const [accountId, ticker] = key.split(':');
    let currentTrade: OpenTrade | null = null;

    for (const exec of groupExecutions) {
      const execDate = new Date(exec.executed_at);
      const isBuy = exec.side === 'BUY';

      // Determine what this execution does
      if (!currentTrade) {
        // No open trade - this starts a new one
        currentTrade = startNewTrade(accountId, ticker, exec, execDate);
      } else {
        const isLong = currentTrade.direction === 'LONG';
        const isAddingToPosition = (isLong && isBuy) || (!isLong && !isBuy);

        if (isAddingToPosition) {
          // Adding to existing position
          addToPosition(currentTrade, exec, execDate);
        } else {
          // Reducing position
          const closeResult = reducePosition(currentTrade, exec, execDate);

          if (closeResult.fullyClosed) {
            // Trade is closed - finalize it
            completedTrades.push(finalizeTrade(currentTrade, true));
            currentTrade = null;

            // If there are remaining shares from this execution, start a new opposite trade
            if (closeResult.remainingShares > 0) {
              currentTrade = startNewTradeFromRemainder(
                accountId,
                ticker,
                exec,
                execDate,
                closeResult.remainingShares,
                !isLong ? 'LONG' : 'SHORT'
              );
            }
          }
        }
      }
    }

    // If there's still an open trade, add it as open
    if (currentTrade) {
      completedTrades.push(finalizeTrade(currentTrade, false));
    }
  }

  // Sort completed trades by entry datetime
  completedTrades.sort((a, b) => a.entryDatetime.getTime() - b.entryDatetime.getTime());

  return {
    trades: completedTrades,
    unmatchedExecutions,
    errors,
  };
}

/**
 * Start a new trade from an execution
 */
function startNewTrade(
  accountId: string,
  ticker: string,
  exec: Execution,
  execDate: Date
): OpenTrade {
  const direction: 'LONG' | 'SHORT' = exec.side === 'BUY' ? 'LONG' : 'SHORT';

  return {
    accountId,
    ticker,
    direction,
    entryLots: [
      {
        executionId: exec.execution_id,
        shares: exec.quantity,
        price: exec.price,
        timestamp: execDate,
        remainingShares: exec.quantity,
      },
    ],
    legs: [
      {
        executionId: exec.execution_id,
        legType: 'ENTRY',
        shares: exec.quantity,
        price: exec.price,
        executedAt: execDate,
      },
    ],
    totalEntryShares: exec.quantity,
    totalEntryCost: exec.quantity * exec.price,
    totalExitShares: 0,
    totalExitProceeds: 0,
    totalCommission: exec.commission,
    entryDatetime: execDate,
    lastExitDatetime: null,
  };
}

/**
 * Start a new trade from remainder of an execution that reversed position
 */
function startNewTradeFromRemainder(
  accountId: string,
  ticker: string,
  exec: Execution,
  execDate: Date,
  shares: number,
  direction: 'LONG' | 'SHORT'
): OpenTrade {
  return {
    accountId,
    ticker,
    direction,
    entryLots: [
      {
        executionId: exec.execution_id,
        shares,
        price: exec.price,
        timestamp: execDate,
        remainingShares: shares,
      },
    ],
    legs: [
      {
        executionId: exec.execution_id,
        legType: 'ENTRY',
        shares,
        price: exec.price,
        executedAt: execDate,
      },
    ],
    totalEntryShares: shares,
    totalEntryCost: shares * exec.price,
    totalExitShares: 0,
    totalExitProceeds: 0,
    totalCommission: 0, // Commission already counted in the closing trade
    entryDatetime: execDate,
    lastExitDatetime: null,
  };
}

/**
 * Add to an existing position
 */
function addToPosition(trade: OpenTrade, exec: Execution, execDate: Date): void {
  trade.entryLots.push({
    executionId: exec.execution_id,
    shares: exec.quantity,
    price: exec.price,
    timestamp: execDate,
    remainingShares: exec.quantity,
  });

  trade.legs.push({
    executionId: exec.execution_id,
    legType: 'ADD',
    shares: exec.quantity,
    price: exec.price,
    executedAt: execDate,
  });

  trade.totalEntryShares += exec.quantity;
  trade.totalEntryCost += exec.quantity * exec.price;
  trade.totalCommission += exec.commission;
}

/**
 * Reduce a position (trim or close)
 */
function reducePosition(
  trade: OpenTrade,
  exec: Execution,
  execDate: Date
): { fullyClosed: boolean; remainingShares: number } {
  let sharesToClose = exec.quantity;
  let sharesClosed = 0;

  // FIFO: close from oldest lots first
  for (const lot of trade.entryLots) {
    if (sharesToClose <= 0) break;
    if (lot.remainingShares <= 0) continue;

    const closingShares = Math.min(lot.remainingShares, sharesToClose);
    lot.remainingShares -= closingShares;
    sharesToClose -= closingShares;
    sharesClosed += closingShares;
  }

  // Update trade totals
  trade.totalExitShares += sharesClosed;
  trade.totalExitProceeds += sharesClosed * exec.price;
  trade.totalCommission += exec.commission;
  trade.lastExitDatetime = execDate;

  // Calculate remaining position
  const remainingPosition = trade.entryLots.reduce((sum, lot) => sum + lot.remainingShares, 0);

  // Determine leg type
  const legType = remainingPosition === 0 ? 'EXIT' : 'TRIM';

  trade.legs.push({
    executionId: exec.execution_id,
    legType,
    shares: sharesClosed,
    price: exec.price,
    executedAt: execDate,
  });

  return {
    fullyClosed: remainingPosition === 0,
    remainingShares: sharesToClose, // Shares that couldn't be matched (position reversal)
  };
}

/**
 * Finalize a trade for database insertion
 */
function finalizeTrade(trade: OpenTrade, isClosed: boolean): MatchedTrade {
  const entryPrice = trade.totalEntryCost / trade.totalEntryShares;
  const exitPrice = trade.totalExitShares > 0 ? trade.totalExitProceeds / trade.totalExitShares : null;

  const remainingShares = trade.entryLots.reduce((sum, lot) => sum + lot.remainingShares, 0);

  // Calculate realized P&L (only for closed portions)
  let realizedPnl: number | null = null;
  if (trade.totalExitShares > 0) {
    if (trade.direction === 'LONG') {
      // Long: profit when exit > entry
      realizedPnl = trade.totalExitProceeds - (trade.totalExitShares / trade.totalEntryShares) * trade.totalEntryCost;
    } else {
      // Short: profit when entry > exit
      realizedPnl = (trade.totalExitShares / trade.totalEntryShares) * trade.totalEntryCost - trade.totalExitProceeds;
    }
    // Subtract commission from P&L
    realizedPnl -= trade.totalCommission;
  }

  return {
    accountId: trade.accountId,
    ticker: trade.ticker,
    direction: trade.direction,
    status: isClosed ? 'CLOSED' : 'OPEN',
    entryDatetime: trade.entryDatetime,
    exitDatetime: trade.lastExitDatetime,
    entryPrice: Math.round(entryPrice * 10000) / 10000,
    exitPrice: exitPrice ? Math.round(exitPrice * 10000) / 10000 : null,
    totalShares: trade.totalEntryShares,
    remainingShares,
    realizedPnl: realizedPnl ? Math.round(realizedPnl * 100) / 100 : null,
    totalCommission: Math.round(trade.totalCommission * 100) / 100,
    legs: trade.legs,
  };
}

/**
 * Convert matched trade to database insert format
 */
export function toTradeInsert(
  trade: MatchedTrade
): Omit<Trade, 'id' | 'created_at' | 'updated_at'> {
  return {
    account_id: trade.accountId,
    ticker: trade.ticker,
    direction: trade.direction,
    status: trade.status,
    entry_datetime: trade.entryDatetime.toISOString(),
    exit_datetime: trade.exitDatetime?.toISOString() || null,
    entry_price: trade.entryPrice,
    exit_price: trade.exitPrice,
    total_shares: trade.totalShares,
    remaining_shares: trade.remainingShares,
    realized_pnl: trade.realizedPnl,
    total_commission: trade.totalCommission,
  };
}

/**
 * Convert matched trade legs to database insert format
 */
export function toTradeLegInserts(
  tradeId: number,
  legs: TradeLegInput[]
): Omit<TradeLeg, 'id'>[] {
  return legs.map((leg) => ({
    trade_id: tradeId,
    execution_id: leg.executionId,
    leg_type: leg.legType,
    shares: leg.shares,
    price: leg.price,
    executed_at: leg.executedAt.toISOString(),
  }));
}

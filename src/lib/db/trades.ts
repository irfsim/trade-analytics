import { supabase } from '../supabase';
import type { Trade, TradeLeg, TradeAnnotation, TradeWithDetails, Account, CashFlow } from '@/types/database';
import type { MatchedTrade } from '../trade-matcher';
import { toTradeInsert, toTradeLegInserts } from '../trade-matcher';

/**
 * Insert a matched trade with its legs
 */
export async function insertTrade(matchedTrade: MatchedTrade): Promise<number> {
  const tradeData = toTradeInsert(matchedTrade);

  // Insert the trade
  const { data: trade, error: tradeError } = await supabase
    .from('trades')
    .insert(tradeData)
    .select('id')
    .single();

  if (tradeError) {
    throw new Error(`Failed to insert trade: ${tradeError.message}`);
  }

  const tradeId = trade.id;

  // Insert the legs
  const legsData = toTradeLegInserts(tradeId, matchedTrade.legs);

  const { error: legsError } = await supabase.from('trade_legs').insert(legsData);

  if (legsError) {
    // Rollback the trade
    await supabase.from('trades').delete().eq('id', tradeId);
    throw new Error(`Failed to insert trade legs: ${legsError.message}`);
  }

  return tradeId;
}

/**
 * Insert multiple matched trades
 */
export async function insertTrades(
  matchedTrades: MatchedTrade[]
): Promise<{ inserted: number; errors: string[] }> {
  const errors: string[] = [];
  let inserted = 0;

  for (const trade of matchedTrades) {
    try {
      await insertTrade(trade);
      inserted++;
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  return { inserted, errors };
}

export interface TradeWithRating extends Trade {
  setup_rating: number | null;
  followed_plan: boolean | null;
  setup_type_name: string | null;
  setup_type_color: string | null;
  account_pct: number | null;
  position_size_pct: number | null;
}

/**
 * Get trades with optional filters
 */
export async function getTrades(options?: {
  accountId?: string;
  status?: 'OPEN' | 'CLOSED';
  ticker?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}): Promise<TradeWithRating[]> {
  let query = supabase.from('trades').select(`
    *,
    trade_annotations(setup_rating, followed_plan, setup_type_id, setup_types(name, color))
  `);

  if (options?.accountId) {
    query = query.eq('account_id', options.accountId);
  }

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.ticker) {
    query = query.eq('ticker', options.ticker);
  }

  if (options?.from) {
    query = query.gte('entry_datetime', options.from);
  }

  if (options?.to) {
    query = query.lte('entry_datetime', options.to);
  }

  query = query.order('entry_datetime', { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch trades: ${error.message}`);
  }

  // Flatten the setup_rating, followed_plan, setup_type_name, and setup_type_color from the joined annotation
  return (data || []).map(({ trade_annotations, ...trade }) => ({
    ...trade,
    setup_rating: trade_annotations?.setup_rating ?? null,
    followed_plan: trade_annotations?.followed_plan ?? null,
    setup_type_name: trade_annotations?.setup_types?.name ?? null,
    setup_type_color: trade_annotations?.setup_types?.color ?? null,
  }));
}

/**
 * Get a single trade with legs and annotation
 */
export async function getTradeWithDetails(tradeId: number): Promise<TradeWithDetails | null> {
  const { data: trade, error: tradeError } = await supabase
    .from('trades')
    .select('*')
    .eq('id', tradeId)
    .single();

  if (tradeError) {
    if (tradeError.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch trade: ${tradeError.message}`);
  }

  // Get legs
  const { data: legs, error: legsError } = await supabase
    .from('trade_legs')
    .select('*')
    .eq('trade_id', tradeId)
    .order('executed_at', { ascending: true });

  if (legsError) {
    throw new Error(`Failed to fetch trade legs: ${legsError.message}`);
  }

  // Get annotation
  const { data: annotation, error: annotationError } = await supabase
    .from('trade_annotations')
    .select('*')
    .eq('trade_id', tradeId)
    .single();

  // Annotation might not exist, that's okay
  const annotationData = annotationError?.code === 'PGRST116' ? null : annotation;

  return {
    ...trade,
    legs: legs || [],
    annotation: annotationData,
  };
}

/**
 * Get open positions
 */
export async function getOpenPositions(accountId?: string): Promise<Trade[]> {
  return getTrades({ accountId, status: 'OPEN' });
}

/**
 * Update a trade (e.g., when more executions are matched)
 */
export async function updateTrade(
  tradeId: number,
  updates: Partial<Omit<Trade, 'id' | 'created_at'>>
): Promise<void> {
  const { error } = await supabase
    .from('trades')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', tradeId);

  if (error) {
    throw new Error(`Failed to update trade: ${error.message}`);
  }
}

/**
 * Delete a trade and its legs (for re-matching)
 */
export async function deleteTrade(tradeId: number): Promise<void> {
  // Legs will be deleted via CASCADE
  const { error } = await supabase.from('trades').delete().eq('id', tradeId);

  if (error) {
    throw new Error(`Failed to delete trade: ${error.message}`);
  }
}

/**
 * Delete all trades for re-matching
 */
export async function deleteAllTrades(): Promise<void> {
  const { error } = await supabase.from('trades').delete().neq('id', 0);

  if (error) {
    throw new Error(`Failed to delete trades: ${error.message}`);
  }
}

/**
 * Get trades that need annotation
 */
export async function getTradesNeedingAnnotation(
  accountId?: string,
  limit: number = 50
): Promise<Trade[]> {
  let query = supabase
    .from('trades')
    .select(`
      *,
      trade_annotations!left(trade_id)
    `)
    .is('trade_annotations.trade_id', null)
    .eq('status', 'CLOSED');

  if (accountId) {
    query = query.eq('account_id', accountId);
  }

  query = query.order('exit_datetime', { ascending: false }).limit(limit);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch trades needing annotation: ${error.message}`);
  }

  // Remove the join data
  return (data || []).map(({ trade_annotations, ...trade }) => trade);
}

/**
 * Get all closed trades for balance calculation (minimal data)
 */
export async function getAllClosedTradesForBalance(accountId?: string): Promise<
  { id: number; account_id: string; exit_datetime: string; realized_pnl: number }[]
> {
  let query = supabase
    .from('trades')
    .select('id, account_id, exit_datetime, realized_pnl')
    .eq('status', 'CLOSED')
    .not('exit_datetime', 'is', null)
    .not('realized_pnl', 'is', null)
    .order('exit_datetime', { ascending: true });

  if (accountId) {
    query = query.eq('account_id', accountId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch trades for balance: ${error.message}`);
  }

  return data || [];
}

/**
 * Get accounts with starting balances
 */
export async function getAccountsWithBalances(accountId?: string): Promise<
  { account_id: string; starting_balance: number }[]
> {
  let query = supabase.from('accounts').select('account_id, starting_balance');

  if (accountId) {
    query = query.eq('account_id', accountId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch accounts: ${error.message}`);
  }

  return data || [];
}

/**
 * Get cash flows for balance calculation
 */
export async function getCashFlowsForBalance(accountId?: string): Promise<CashFlow[]> {
  let query = supabase
    .from('cash_flows')
    .select('*')
    .order('flow_date', { ascending: true });

  if (accountId) {
    query = query.eq('account_id', accountId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch cash flows: ${error.message}`);
  }

  return data || [];
}

/**
 * Calculate account percentage and position size for each trade
 * Returns a map of trade_id -> { account_pct, position_size_pct }
 */
export function calculateTradePercentages(
  trades: TradeWithRating[],
  allClosedTrades: { id: number; account_id: string; exit_datetime: string; realized_pnl: number }[],
  accounts: { account_id: string; starting_balance: number }[],
  cashFlows: CashFlow[],
  filterAccountId?: string
): Map<number, { account_pct: number | null; position_size_pct: number | null }> {
  const result = new Map<number, { account_pct: number | null; position_size_pct: number | null }>();

  // Create a map of account_id -> starting_balance
  const accountBalances = new Map(accounts.map(a => [a.account_id, a.starting_balance]));

  // Helper to calculate balance at a given date
  const getBalanceAtDate = (
    dateStr: string,
    relevantAccountIds: string[],
    excludeTradeId?: number
  ) => {
    let balance = relevantAccountIds.reduce(
      (sum, accId) => sum + (accountBalances.get(accId) || 0),
      0
    );

    // Add cash flows before the date
    const targetDate = dateStr.split('T')[0];
    for (const cf of cashFlows) {
      if (!relevantAccountIds.includes(cf.account_id)) continue;
      if (cf.flow_date >= targetDate) break;
      balance += cf.flow_type === 'DEPOSIT' ? cf.amount : -cf.amount;
    }

    // Add realized P&L from trades closed before the date
    for (const closedTrade of allClosedTrades) {
      if (excludeTradeId && closedTrade.id === excludeTradeId) continue;
      if (!relevantAccountIds.includes(closedTrade.account_id)) continue;
      if (closedTrade.exit_datetime >= dateStr) break;
      balance += closedTrade.realized_pnl;
    }

    return balance;
  };

  for (const trade of trades) {
    // Determine which accounts to include in balance calculation
    const relevantAccountIds = filterAccountId
      ? [filterAccountId]
      : [...accountBalances.keys()];

    // Calculate position size % (at entry time)
    let positionSizePct: number | null = null;
    if (trade.entry_price !== null && trade.total_shares > 0) {
      const balanceAtEntry = getBalanceAtDate(trade.entry_datetime, relevantAccountIds, trade.id);
      if (balanceAtEntry > 0) {
        const positionValue = trade.total_shares * trade.entry_price;
        positionSizePct = Math.round((positionValue / balanceAtEntry) * 100 * 100) / 100;
      }
    }

    // Calculate account % (P&L as % of account at exit)
    let accountPct: number | null = null;
    if (trade.status === 'CLOSED' && trade.realized_pnl !== null && trade.exit_datetime !== null) {
      const balanceAtExit = getBalanceAtDate(trade.exit_datetime, relevantAccountIds, trade.id);
      if (balanceAtExit > 0) {
        accountPct = Math.round((trade.realized_pnl / balanceAtExit) * 100 * 100) / 100;
      }
    }

    result.set(trade.id, { account_pct: accountPct, position_size_pct: positionSizePct });
  }

  return result;
}

/**
 * Get trade count by status
 */
export async function getTradeStats(accountId?: string): Promise<{
  total: number;
  open: number;
  closed: number;
  needsAnnotation: number;
}> {
  let baseQuery = supabase.from('trades').select('*', { count: 'exact', head: true });

  if (accountId) {
    baseQuery = baseQuery.eq('account_id', accountId);
  }

  const [totalRes, openRes, closedRes] = await Promise.all([
    baseQuery,
    supabase
      .from('trades')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'OPEN')
      .then((r) => (accountId ? { ...r } : r)),
    supabase
      .from('trades')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'CLOSED')
      .then((r) => (accountId ? { ...r } : r)),
  ]);

  const needsAnnotationRes = await supabase
    .from('trades')
    .select(`*, trade_annotations!left(trade_id)`, { count: 'exact', head: true })
    .is('trade_annotations.trade_id', null)
    .eq('status', 'CLOSED');

  return {
    total: totalRes.count || 0,
    open: openRes.count || 0,
    closed: closedRes.count || 0,
    needsAnnotation: needsAnnotationRes.count || 0,
  };
}

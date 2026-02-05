import { createClient } from '../supabase/server';
import type { Execution } from '@/types/database';
import type { ParsedExecution } from '../flex-parser';

/**
 * Insert executions, skipping duplicates
 */
export async function insertExecutions(
  executions: Omit<Execution, 'id' | 'imported_at'>[]
): Promise<{ inserted: number; skipped: number; errors: string[] }> {
  const supabase = await createClient();
  const errors: string[] = [];
  let inserted = 0;
  let skipped = 0;

  for (const exec of executions) {
    const { error } = await supabase.from('executions').insert(exec);

    if (error) {
      if (error.code === '23505') {
        // Unique constraint violation - already exists
        skipped++;
      } else {
        errors.push(`Failed to insert ${exec.execution_id}: ${error.message}`);
      }
    } else {
      inserted++;
    }
  }

  return { inserted, skipped, errors };
}

/**
 * Get all executions for an account
 */
export async function getExecutions(
  accountId?: string,
  options?: {
    from?: string;
    to?: string;
    ticker?: string;
    limit?: number;
    offset?: number;
  }
): Promise<Execution[]> {
  const supabase = await createClient();
  let query = supabase.from('executions').select('*');

  if (accountId) {
    query = query.eq('account_id', accountId);
  }

  if (options?.from) {
    query = query.gte('executed_at', options.from);
  }

  if (options?.to) {
    query = query.lte('executed_at', options.to);
  }

  if (options?.ticker) {
    query = query.eq('ticker', options.ticker);
  }

  query = query.order('executed_at', { ascending: true });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch executions: ${error.message}`);
  }

  return data || [];
}

/**
 * Get executions not yet matched to trades
 */
export async function getUnmatchedExecutions(accountId?: string): Promise<Execution[]> {
  const supabase = await createClient();
  // Get all executions that don't have a corresponding trade_leg
  let query = supabase
    .from('executions')
    .select(`
      *,
      trade_legs!left(id)
    `)
    .is('trade_legs.id', null);

  if (accountId) {
    query = query.eq('account_id', accountId);
  }

  query = query.order('executed_at', { ascending: true });

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch unmatched executions: ${error.message}`);
  }

  // Remove the join data from results
  return (data || []).map(({ trade_legs, ...exec }) => exec);
}

/**
 * Get execution by ID
 */
export async function getExecution(executionId: string): Promise<Execution | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('executions')
    .select('*')
    .eq('execution_id', executionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to fetch execution: ${error.message}`);
  }

  return data;
}

/**
 * Check if an execution already exists
 */
export async function executionExists(executionId: string): Promise<boolean> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('executions')
    .select('*', { count: 'exact', head: true })
    .eq('execution_id', executionId);

  if (error) {
    throw new Error(`Failed to check execution: ${error.message}`);
  }

  return (count || 0) > 0;
}

/**
 * Get distinct tickers from executions
 */
export async function getDistinctTickers(accountId?: string): Promise<string[]> {
  const supabase = await createClient();
  let query = supabase.from('executions').select('ticker');

  if (accountId) {
    query = query.eq('account_id', accountId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch tickers: ${error.message}`);
  }

  const tickers = [...new Set((data || []).map((d) => d.ticker))];
  return tickers.sort();
}

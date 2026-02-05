import { createClient } from '../supabase/server';
import type { CashFlow } from '@/types/database';

/**
 * Get all cash flows, optionally filtered by account
 */
export async function getCashFlows(accountId?: string): Promise<CashFlow[]> {
  const supabase = await createClient();
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
 * Get cash flows before a specific date
 */
export async function getCashFlowsBefore(
  accountId: string,
  beforeDate: string
): Promise<CashFlow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cash_flows')
    .select('*')
    .eq('account_id', accountId)
    .lt('flow_date', beforeDate)
    .order('flow_date', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch cash flows: ${error.message}`);
  }

  return data || [];
}

/**
 * Insert a new cash flow
 */
export async function insertCashFlow(cashFlow: {
  account_id: string;
  flow_type: 'DEPOSIT' | 'WITHDRAWAL';
  amount: number;
  flow_date: string;
  notes?: string;
}): Promise<CashFlow> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cash_flows')
    .insert(cashFlow)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to insert cash flow: ${error.message}`);
  }

  return data;
}

/**
 * Update a cash flow
 */
export async function updateCashFlow(
  id: number,
  updates: Partial<Omit<CashFlow, 'id' | 'created_at'>>
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('cash_flows')
    .update(updates)
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to update cash flow: ${error.message}`);
  }
}

/**
 * Delete a cash flow
 */
export async function deleteCashFlow(id: number): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('cash_flows').delete().eq('id', id);

  if (error) {
    throw new Error(`Failed to delete cash flow: ${error.message}`);
  }
}

/**
 * Calculate net cash flows (deposits - withdrawals) up to a date
 */
export function calculateNetCashFlows(cashFlows: CashFlow[]): number {
  return cashFlows.reduce((sum, cf) => {
    return cf.flow_type === 'DEPOSIT' ? sum + cf.amount : sum - cf.amount;
  }, 0);
}

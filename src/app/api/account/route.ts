import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Get user's accounts
    const { data: accounts } = await adminClient
      .from('accounts')
      .select('account_id')
      .eq('user_id', user.id);

    const accountIds = (accounts || []).map((a: { account_id: string }) => a.account_id);

    let tradeCount = 0;
    let executionCount = 0;

    if (accountIds.length > 0) {
      const [trades, executions] = await Promise.all([
        adminClient.from('trades').select('id', { count: 'exact', head: true }).in('account_id', accountIds),
        adminClient.from('executions').select('id', { count: 'exact', head: true }).in('account_id', accountIds),
      ]);
      tradeCount = trades.count || 0;
      executionCount = executions.count || 0;
    }

    return NextResponse.json({
      accounts: accountIds.length,
      trades: tradeCount,
      executions: executionCount,
    });
  } catch (error) {
    console.error('Error fetching account stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch account stats', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
    const adminClient = createAdminClient();

    // Get user's account IDs
    const { data: accounts } = await adminClient
      .from('accounts')
      .select('account_id')
      .eq('user_id', userId);

    const accountIds = (accounts || []).map((a: { account_id: string }) => a.account_id);

    if (accountIds.length > 0) {
      // Get trade IDs for cascade cleanup
      const { data: trades } = await adminClient
        .from('trades')
        .select('id')
        .in('account_id', accountIds);

      const tradeIds = (trades || []).map((t: { id: number }) => t.id);

      if (tradeIds.length > 0) {
        await adminClient.from('trade_annotations').delete().in('trade_id', tradeIds);
        await adminClient.from('trade_legs').delete().in('trade_id', tradeIds);
        await adminClient.from('trades').delete().in('account_id', accountIds);
      }

      // Delete executions (FK to accounts, no cascade)
      await adminClient.from('executions').delete().in('account_id', accountIds);

      // Delete cash_flows, summaries
      await adminClient.from('cash_flows').delete().in('account_id', accountIds);
      await adminClient.from('daily_summaries').delete().in('account_id', accountIds);
      await adminClient.from('weekly_summaries').delete().in('account_id', accountIds);
      await adminClient.from('monthly_summaries').delete().in('account_id', accountIds);
      await adminClient.from('yearly_summaries').delete().in('account_id', accountIds);

      // Delete accounts
      await adminClient.from('accounts').delete().eq('user_id', userId);
    }

    // Delete user-owned setup types (not defaults)
    await adminClient.from('setup_types').delete().eq('user_id', userId);

    // Delete user profile
    await adminClient.from('user_profiles').delete().eq('id', userId);

    // Delete auth user (final step)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      throw new Error(`Failed to delete auth user: ${deleteError.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete account', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import {
  getConnection,
  getAccountMappingFromLinks,
  createSyncHistory,
  completeSyncHistory,
  updateConnectionStatus,
  updateConnectionLastSync,
} from '@/lib/db/connections';
import { getBrokerAdapter } from '@/lib/brokers';
import { toExecutionInserts } from '@/lib/flex-parser';
import { insertExecutions, getExecutions } from '@/lib/db/executions';
import { insertTrades } from '@/lib/db/trades';
import { matchExecutionsToTrades } from '@/lib/trade-matcher';
import type { SyncTriggerType } from '@/types/database';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/connections/[id]/sync - Trigger a sync for this connection
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const connectionId = parseInt(id, 10);

    if (isNaN(connectionId)) {
      return NextResponse.json({ error: 'Invalid connection ID' }, { status: 400 });
    }

    const connection = await getConnection(connectionId);

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Parse request body for options
    const body = await request.json().catch(() => ({}));
    const triggerType: SyncTriggerType = body.trigger_type || 'manual';
    const fromDate = body.from_date ? new Date(body.from_date) : undefined;
    const toDate = body.to_date ? new Date(body.to_date) : undefined;

    // Create sync history entry
    const syncHistory = await createSyncHistory(
      connectionId,
      triggerType,
      fromDate,
      toDate
    );

    try {
      // Get the appropriate adapter
      const adapter = getBrokerAdapter(connection.broker_type);

      // Fetch executions
      const fetchResult = await adapter.fetchExecutions(
        {
          connectionId: connection.id,
          flexToken: connection.flex_token || undefined,
          flexQueryId: connection.flex_query_id || undefined,
        },
        { fromDate, toDate }
      );

      if (!fetchResult.success) {
        await completeSyncHistory(syncHistory.id, {
          status: 'error',
          executionsFetched: 0,
          errorMessage: fetchResult.errors.join(', '),
        });
        await updateConnectionStatus(connectionId, 'error', fetchResult.errors.join(', '));

        return NextResponse.json({
          success: false,
          error: 'Failed to fetch executions',
          details: fetchResult.errors,
        });
      }

      // Get account mapping from database links
      const accountMapping = await getAccountMappingFromLinks(connectionId);

      // Convert to database format with account mapping
      const executionsToInsert = toExecutionInserts(fetchResult.executions, accountMapping);

      // Insert executions (skip duplicates)
      const insertResult = await insertExecutions(executionsToInsert);

      // Re-match trades if new executions were inserted
      let tradesMatched = 0;
      if (insertResult.inserted > 0) {
        const allExecutions = await getExecutions();
        const matched = matchExecutionsToTrades(allExecutions);
        const tradeResult = await insertTrades(matched.trades);
        tradesMatched = tradeResult.inserted;
      }

      // Update sync history
      await completeSyncHistory(syncHistory.id, {
        status: insertResult.errors.length > 0 ? 'partial' : 'success',
        executionsFetched: fetchResult.executions.length,
        executionsInserted: insertResult.inserted,
        executionsSkipped: insertResult.skipped,
        tradesMatched,
        errorMessage: insertResult.errors.length > 0 ? insertResult.errors.join(', ') : undefined,
      });

      // Update connection status
      await updateConnectionStatus(connectionId, 'active');
      await updateConnectionLastSync(connectionId);

      return NextResponse.json({
        success: true,
        synced_at: new Date().toISOString(),
        executions: {
          fetched: fetchResult.executions.length,
          inserted: insertResult.inserted,
          skipped: insertResult.skipped,
          errors: insertResult.errors,
        },
        trades: {
          matched: tradesMatched,
        },
        accountsProcessed: fetchResult.accountsProcessed,
      });
    } catch (error) {
      // Update sync history with error
      await completeSyncHistory(syncHistory.id, {
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Sync failed',
      });
      await updateConnectionStatus(
        connectionId,
        'error',
        error instanceof Error ? error.message : 'Sync failed'
      );

      throw error;
    }
  } catch (error) {
    console.error('Error syncing connection:', error);
    return NextResponse.json(
      {
        error: 'Failed to sync connection',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

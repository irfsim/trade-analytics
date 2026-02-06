import { NextResponse } from 'next/server';
import {
  getConnectionsWithAccounts,
  getLastSync,
} from '@/lib/db/connections';

/**
 * GET /api/sync/status - Get sync status for all connections
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const connectionId = url.searchParams.get('connectionId');

    // If a specific connection is requested
    if (connectionId) {
      const id = parseInt(connectionId, 10);
      if (isNaN(id)) {
        return NextResponse.json({ error: 'Invalid connection ID' }, { status: 400 });
      }

      const lastSync = await getLastSync(id);

      return NextResponse.json({
        connection_id: id,
        last_sync: lastSync,
        is_syncing: lastSync?.status === 'running',
      });
    }

    // Get all connections with their sync status
    const connections = await getConnectionsWithAccounts();

    const statuses = connections.map(conn => ({
      connection_id: conn.id,
      label: conn.label,
      broker_type: conn.broker_type,
      status: conn.status,
      auto_sync_enabled: conn.auto_sync_enabled,
      last_sync_at: conn.last_sync_at,
      last_sync: conn.last_sync,
      is_syncing: conn.last_sync?.status === 'running',
      has_error: conn.status === 'error',
      error_message: conn.last_error,
    }));

    // Overall sync status
    const isSyncing = statuses.some(s => s.is_syncing);
    const hasError = statuses.some(s => s.has_error);
    const lastSyncAt = statuses
      .map(s => s.last_sync_at)
      .filter(Boolean)
      .sort()
      .pop() || null;

    return NextResponse.json({
      overall: {
        is_syncing: isSyncing,
        has_error: hasError,
        last_sync_at: lastSyncAt,
        total_connections: connections.length,
        active_connections: connections.filter(c => c.status === 'active').length,
      },
      connections: statuses,
    });
  } catch (error) {
    console.error('Error fetching sync status:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch sync status',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

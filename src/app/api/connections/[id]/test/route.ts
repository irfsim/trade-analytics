import { NextResponse } from 'next/server';
import { getConnection, updateConnectionStatus } from '@/lib/db/connections';
import { getBrokerAdapter } from '@/lib/brokers';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/connections/[id]/test - Test connection credentials
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

    // Get the appropriate adapter
    const adapter = getBrokerAdapter(connection.broker_type);

    // Test the connection
    const result = await adapter.testConnection({
      connectionId: connection.id,
      flexToken: connection.flex_token || undefined,
      flexQueryId: connection.flex_query_id || undefined,
    });

    // Update connection status based on result
    if (result.success) {
      await updateConnectionStatus(connectionId, 'active');
    } else {
      await updateConnectionStatus(connectionId, 'error', result.error);
    }

    return NextResponse.json({
      success: result.success,
      error: result.error,
      accountsFound: result.accountsFound,
    });
  } catch (error) {
    console.error('Error testing connection:', error);
    return NextResponse.json(
      {
        error: 'Failed to test connection',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

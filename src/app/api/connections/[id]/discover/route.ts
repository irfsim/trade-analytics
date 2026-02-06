import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db/connections';
import { getBrokerAdapter } from '@/lib/brokers';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/connections/[id]/discover - Discover accounts from broker
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

    // Discover accounts
    const accounts = await adapter.discoverAccounts({
      connectionId: connection.id,
      flexToken: connection.flex_token || undefined,
      flexQueryId: connection.flex_query_id || undefined,
    });

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('Error discovering accounts:', error);
    return NextResponse.json(
      {
        error: 'Failed to discover accounts',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

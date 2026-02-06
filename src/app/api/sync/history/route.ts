import { NextResponse } from 'next/server';
import { getSyncHistory, getAllSyncHistory } from '@/lib/db/connections';

/**
 * GET /api/sync/history - Get sync history
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const connectionId = url.searchParams.get('connectionId');
    const limitStr = url.searchParams.get('limit');
    const limit = limitStr ? parseInt(limitStr, 10) : 20;

    // If a specific connection is requested
    if (connectionId) {
      const id = parseInt(connectionId, 10);
      if (isNaN(id)) {
        return NextResponse.json({ error: 'Invalid connection ID' }, { status: 400 });
      }

      const history = await getSyncHistory(id, limit);

      return NextResponse.json({ history });
    }

    // Get all sync history
    const history = await getAllSyncHistory(limit);

    return NextResponse.json({ history });
  } catch (error) {
    console.error('Error fetching sync history:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch sync history',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

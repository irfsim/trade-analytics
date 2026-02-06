import { NextResponse } from 'next/server';
import {
  getConnectionWithAccounts,
  updateConnection,
  deleteConnection,
} from '@/lib/db/connections';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/connections/[id] - Get a connection by ID
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const connectionId = parseInt(id, 10);

    if (isNaN(connectionId)) {
      return NextResponse.json({ error: 'Invalid connection ID' }, { status: 400 });
    }

    const connection = await getConnectionWithAccounts(connectionId);

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    return NextResponse.json({ connection });
  } catch (error) {
    console.error('Error fetching connection:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch connection',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/connections/[id] - Update a connection
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const connectionId = parseInt(id, 10);

    if (isNaN(connectionId)) {
      return NextResponse.json({ error: 'Invalid connection ID' }, { status: 400 });
    }

    const body = await request.json();

    // Only allow updating certain fields
    const allowedFields = [
      'label',
      'flex_token',
      'flex_query_id',
      'auto_sync_enabled',
      'sync_interval_hours',
      'status',
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const connection = await updateConnection(connectionId, updates);

    return NextResponse.json({ connection });
  } catch (error) {
    console.error('Error updating connection:', error);
    return NextResponse.json(
      {
        error: 'Failed to update connection',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/connections/[id] - Delete a connection
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const connectionId = parseInt(id, 10);

    if (isNaN(connectionId)) {
      return NextResponse.json({ error: 'Invalid connection ID' }, { status: 400 });
    }

    await deleteConnection(connectionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting connection:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete connection',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

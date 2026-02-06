import { NextResponse } from 'next/server';
import {
  getConnectionsWithAccounts,
  createConnection,
} from '@/lib/db/connections';
import type { BrokerType } from '@/types/database';

/**
 * GET /api/connections - List all broker connections
 */
export async function GET() {
  try {
    const connections = await getConnectionsWithAccounts();

    return NextResponse.json({ connections });
  } catch (error) {
    console.error('Error fetching connections:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch connections',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/connections - Create a new broker connection
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { broker_type, label, flex_token, flex_query_id, auto_sync_enabled } = body;

    // Validate required fields
    if (!broker_type || !label) {
      return NextResponse.json(
        { error: 'Missing required fields: broker_type, label' },
        { status: 400 }
      );
    }

    // Validate broker type
    if (!['ibkr_flex', 'schwab', 'tda'].includes(broker_type)) {
      return NextResponse.json(
        { error: 'Invalid broker_type' },
        { status: 400 }
      );
    }

    // For IBKR Flex, require credentials
    if (broker_type === 'ibkr_flex' && (!flex_token || !flex_query_id)) {
      return NextResponse.json(
        { error: 'IBKR Flex requires flex_token and flex_query_id' },
        { status: 400 }
      );
    }

    const connection = await createConnection({
      broker_type: broker_type as BrokerType,
      label,
      flex_token: flex_token || null,
      flex_query_id: flex_query_id || null,
      status: 'pending',
      last_error: null,
      auto_sync_enabled: auto_sync_enabled ?? true,
      sync_interval_hours: 24,
      last_sync_at: null,
    });

    return NextResponse.json({ connection }, { status: 201 });
  } catch (error) {
    console.error('Error creating connection:', error);
    return NextResponse.json(
      {
        error: 'Failed to create connection',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

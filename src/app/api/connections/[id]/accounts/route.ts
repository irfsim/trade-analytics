import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  getConnection,
  getAccountLinks,
  createAccountLink,
  deleteAccountLink,
} from '@/lib/db/connections';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/connections/[id]/accounts - Get linked accounts
 */
export async function GET(request: Request, { params }: RouteParams) {
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

    const accountLinks = await getAccountLinks(connectionId);

    return NextResponse.json({ account_links: accountLinks });
  } catch (error) {
    console.error('Error fetching account links:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch account links',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/connections/[id]/accounts - Link an account
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

    const body = await request.json();
    const { external_account_id, internal_account_id, account_name, account_type } = body;

    if (!external_account_id || !internal_account_id) {
      return NextResponse.json(
        { error: 'Missing required fields: external_account_id, internal_account_id' },
        { status: 400 }
      );
    }

    // Check if internal account exists, if not create it
    const { data: existingAccount } = await supabase
      .from('accounts')
      .select('account_id')
      .eq('account_id', internal_account_id)
      .single();

    if (!existingAccount) {
      // Create the internal account
      const { error: createError } = await supabase.from('accounts').insert({
        account_id: internal_account_id,
        alias: account_name || internal_account_id,
        account_type: account_type || 'margin',
      });

      if (createError) {
        throw new Error(`Failed to create account: ${createError.message}`);
      }
    }

    // Create the account link
    const accountLink = await createAccountLink({
      broker_connection_id: connectionId,
      external_account_id,
      internal_account_id,
      account_name: account_name || null,
      account_type_from_broker: account_type || null,
      base_currency: 'USD',
    });

    return NextResponse.json({ account_link: accountLink }, { status: 201 });
  } catch (error) {
    console.error('Error linking account:', error);
    return NextResponse.json(
      {
        error: 'Failed to link account',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/connections/[id]/accounts - Unlink an account
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const connectionId = parseInt(id, 10);

    if (isNaN(connectionId)) {
      return NextResponse.json({ error: 'Invalid connection ID' }, { status: 400 });
    }

    const url = new URL(request.url);
    const linkId = url.searchParams.get('link_id');

    if (!linkId) {
      return NextResponse.json(
        { error: 'Missing link_id query parameter' },
        { status: 400 }
      );
    }

    await deleteAccountLink(parseInt(linkId, 10));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unlinking account:', error);
    return NextResponse.json(
      {
        error: 'Failed to unlink account',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

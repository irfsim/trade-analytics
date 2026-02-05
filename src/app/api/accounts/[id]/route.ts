import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id: accountId } = await params;
    const body = await request.json();
    const { alias } = body;

    if (!alias || typeof alias !== 'string' || alias.trim() === '') {
      return NextResponse.json(
        { error: 'Alias is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('accounts')
      .update({ alias: alias.trim() })
      .eq('account_id', accountId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update account: ${error.message}`);
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ account: data });
  } catch (error) {
    console.error('Error updating account:', error);
    return NextResponse.json(
      { error: 'Failed to update account', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

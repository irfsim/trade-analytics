import { NextRequest, NextResponse } from 'next/server';
import { getTradeWithDetails, deleteTrade } from '@/lib/db/trades';
import { isSupabaseConfigured, getDummyTradeDetail } from '@/lib/dummy-data';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tradeId = parseInt(id);

    if (isNaN(tradeId)) {
      return NextResponse.json({ error: 'Invalid trade ID' }, { status: 400 });
    }

    const trade = !isSupabaseConfigured()
      ? getDummyTradeDetail(tradeId)
      : await getTradeWithDetails(tradeId);

    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    return NextResponse.json({ trade });
  } catch (error) {
    console.error('Error fetching trade:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trade', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tradeId = parseInt(id);

    if (isNaN(tradeId)) {
      return NextResponse.json({ error: 'Invalid trade ID' }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true });
    }

    await deleteTrade(tradeId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting trade:', error);
    return NextResponse.json(
      { error: 'Failed to delete trade', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

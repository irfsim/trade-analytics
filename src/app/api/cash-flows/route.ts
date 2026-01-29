import { NextRequest, NextResponse } from 'next/server';
import { getCashFlows, insertCashFlow, deleteCashFlow } from '@/lib/db/cash-flows';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get('accountId') || undefined;

    const cashFlows = await getCashFlows(accountId);

    return NextResponse.json({ cashFlows });
  } catch (error) {
    console.error('Error fetching cash flows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cash flows', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { account_id, flow_type, amount, flow_date, notes } = body;

    if (!account_id || !flow_type || !amount || !flow_date) {
      return NextResponse.json(
        { error: 'Missing required fields: account_id, flow_type, amount, flow_date' },
        { status: 400 }
      );
    }

    if (!['DEPOSIT', 'WITHDRAWAL'].includes(flow_type)) {
      return NextResponse.json(
        { error: 'flow_type must be DEPOSIT or WITHDRAWAL' },
        { status: 400 }
      );
    }

    const cashFlow = await insertCashFlow({
      account_id,
      flow_type,
      amount: parseFloat(amount),
      flow_date,
      notes,
    });

    return NextResponse.json({ cashFlow });
  } catch (error) {
    console.error('Error creating cash flow:', error);
    return NextResponse.json(
      { error: 'Failed to create cash flow', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    await deleteCashFlow(parseInt(id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting cash flow:', error);
    return NextResponse.json(
      { error: 'Failed to delete cash flow', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

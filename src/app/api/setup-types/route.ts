import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/dummy-data';

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      setupTypes: [
        {
          id: 1, name: 'Episodic pivot', description: 'Episodic Pivot', color: '#3b82f6', archived: false, trade_count: 0,
          checklist_items: [
            { id: 'ep-1', label: 'Earnings/news catalyst within last 5 days', order: 0 },
            { id: 'ep-2', label: 'Gap up on above-average volume', order: 1 },
            { id: 'ep-3', label: 'First pullback to rising 10/20 EMA', order: 2 },
          ],
        },
        {
          id: 2, name: 'Flag', description: 'Flag / Pennant', color: '#10b981', archived: false, trade_count: 0,
          checklist_items: [
            { id: 'flag-1', label: 'Strong prior uptrend (pole) of 20%+', order: 0 },
            { id: 'flag-2', label: 'Tight consolidation with declining volume', order: 1 },
            { id: 'flag-3', label: 'Breakout above flag resistance on volume', order: 2 },
          ],
        },
        {
          id: 3, name: 'Base breakout', description: 'Base Breakout', color: '#f59e0b', archived: false, trade_count: 0,
          checklist_items: [
            { id: 'base-1', label: 'Flat base of 3+ weeks with <15% depth', order: 0 },
            { id: 'base-2', label: 'Volume contraction during base formation', order: 1 },
            { id: 'base-3', label: 'Price holding above 50-day moving average', order: 2 },
          ],
        },
      ],
    });
  }

  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get('includeArchived') === 'true';

    let query = supabase
      .from('setup_types')
      .select('*, trade_annotations(count)')
      .order('name', { ascending: true });

    if (!includeArchived) {
      query = query.eq('archived', false);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch setup types: ${error.message}`);
    }

    const setupTypes = (data || []).map((s) => ({
      ...s,
      trade_count: s.trade_annotations?.[0]?.count ?? 0,
      trade_annotations: undefined,
    }));

    return NextResponse.json({ setupTypes });
  } catch (error) {
    console.error('Error fetching setup types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch setup types', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ setupType: { id: 99, name: 'Demo' } }, { status: 201 });
  }

  try {
    const supabase = await createClient();
    const body = await request.json();
    const { name, description, color, checklist_items } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const insertData: Record<string, unknown> = {
      name: name.trim(),
      description: description?.trim() || null,
    };

    // Add color if provided
    if (color) {
      insertData.color = color;
    }

    // Add checklist_items if provided
    if (checklist_items !== undefined) {
      insertData.checklist_items = checklist_items;
    }

    const { data, error } = await supabase
      .from('setup_types')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A setup type with this name already exists' },
          { status: 409 }
        );
      }
      throw new Error(`Failed to create setup type: ${error.message}`);
    }

    return NextResponse.json({ setupType: data }, { status: 201 });
  } catch (error) {
    console.error('Error creating setup type:', error);
    return NextResponse.json(
      { error: 'Failed to create setup type', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('setup_types')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch setup types: ${error.message}`);
    }

    return NextResponse.json({ setupTypes: data || [] });
  } catch (error) {
    console.error('Error fetching setup types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch setup types', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
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

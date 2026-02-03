import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const setupTypeId = parseInt(id, 10);

    if (isNaN(setupTypeId)) {
      return NextResponse.json(
        { error: 'Invalid setup type ID' },
        { status: 400 }
      );
    }

    // Check if this is the default setup
    const { data: existingSetup } = await supabase
      .from('setup_types')
      .select('is_default')
      .eq('id', setupTypeId)
      .single();

    const body = await request.json();
    const { name, description, color, checklist_items, archived } = body;

    // Prevent archiving the default setup
    if (existingSetup?.is_default && archived === true) {
      return NextResponse.json(
        { error: 'Cannot archive the default setup type' },
        { status: 400 }
      );
    }

    // If only archiving, don't require name
    const isArchiveOnly = archived !== undefined && name === undefined;

    if (!isArchiveOnly && (!name || typeof name !== 'string' || name.trim() === '')) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    // Add color if provided
    if (color !== undefined) {
      updateData.color = color;
    }

    // Add checklist_items if provided
    if (checklist_items !== undefined) {
      updateData.checklist_items = checklist_items;
    }

    // Add archived if provided
    if (archived !== undefined) {
      updateData.archived = archived;
    }

    const { data, error } = await supabase
      .from('setup_types')
      .update(updateData)
      .eq('id', setupTypeId)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A setup type with this name already exists' },
          { status: 409 }
        );
      }
      throw new Error(`Failed to update setup type: ${error.message}`);
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Setup type not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ setupType: data });
  } catch (error) {
    console.error('Error updating setup type:', error);
    return NextResponse.json(
      { error: 'Failed to update setup type', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const setupTypeId = parseInt(id, 10);

    if (isNaN(setupTypeId)) {
      return NextResponse.json(
        { error: 'Invalid setup type ID' },
        { status: 400 }
      );
    }

    // Check if this is the default setup
    const { data: existingSetup } = await supabase
      .from('setup_types')
      .select('is_default')
      .eq('id', setupTypeId)
      .single();

    if (existingSetup?.is_default) {
      return NextResponse.json(
        { error: 'Cannot delete the default setup type' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('setup_types')
      .delete()
      .eq('id', setupTypeId);

    if (error) {
      throw new Error(`Failed to delete setup type: ${error.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting setup type:', error);
    return NextResponse.json(
      { error: 'Failed to delete setup type', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

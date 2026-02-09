import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get profile
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch profile: ${error.message}`);
    }

    return NextResponse.json({
      profile: profile || {
        id: user.id,
        display_name: null,
        avatar_url: null,
        flex_query_token: null,
        flex_query_id: null,
      },
      email: user.email,
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Only update fields explicitly sent in the request body
    const updates: Record<string, unknown> = {
      id: user.id,
      updated_at: new Date().toISOString(),
    };
    if ('display_name' in body) updates.display_name = body.display_name ?? null;
    if ('avatar_url' in body) updates.avatar_url = body.avatar_url ?? null;
    if ('flex_query_token' in body) updates.flex_query_token = body.flex_query_token ?? null;
    if ('flex_query_id' in body) updates.flex_query_id = body.flex_query_id ?? null;

    // Upsert profile
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .upsert(updates, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update profile: ${error.message}`);
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

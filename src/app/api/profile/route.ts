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
    const { display_name, avatar_url, flex_query_token, flex_query_id } = body;

    // Upsert profile
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .upsert(
        {
          id: user.id,
          display_name: display_name ?? null,
          avatar_url: avatar_url ?? null,
          flex_query_token: flex_query_token ?? null,
          flex_query_id: flex_query_id ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
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

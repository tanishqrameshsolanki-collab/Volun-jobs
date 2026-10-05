import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '../../../../utils/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut().catch(() => {});
    
    const cookieStore = await cookies();
    cookieStore.delete('volun_demo_session');

    const url = new URL('/login', request.url);
    return NextResponse.redirect(url, { status: 303 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sign out failed' },
      { status: 500 },
    );
  }
}

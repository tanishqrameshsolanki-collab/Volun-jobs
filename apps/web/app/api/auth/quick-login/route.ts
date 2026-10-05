import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../../../../utils/supabase/config';
import { createClient } from '../../../../utils/supabase/server';
import { loadCandidateProfile } from '../../../../lib/candidate-profile';

const DEFAULT_EMAIL = 'candidate@volunjobs.com';

function deriveNameFromEmail(email: string, fallback: string): string {
  const local = email.split('@')[0] || '';
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 1) {
    return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
  }
  return fallback;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const email = (body.email && typeof body.email === 'string' ? body.email.trim() : '') || DEFAULT_EMAIL;

    const { url } = getSupabaseConfig();
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const cookieStore = await cookies();

    // If service role key is present, attempt admin magic link generation
    if (serviceRoleKey) {
      try {
        const admin = createAdminClient(url, serviceRoleKey);
        const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
          type: 'magiclink',
          email,
        });

        if (!linkError && linkData.properties?.hashed_token) {
          const supabase = await createClient();
          const { data: verifyData } = await supabase.auth.verifyOtp({
            token_hash: linkData.properties.hashed_token,
            type: 'magiclink',
          });

          if (verifyData?.user) {
            const derivedName = deriveNameFromEmail(email, 'Candidate');
            cookieStore.set('volun_demo_session', JSON.stringify({
              id: verifyData.user.id,
              email: verifyData.user.email,
              name: derivedName,
            }), {
              path: '/',
              httpOnly: true,
              sameSite: 'lax',
              maxAge: 60 * 60 * 24 * 7,
            });

            return NextResponse.json({
              success: true,
              user: {
                id: verifyData.user.id,
                email: verifyData.user.email,
                name: derivedName,
              },
            });
          }
        }
      } catch (adminErr) {
        console.warn('Admin sign-in attempt notice:', adminErr);
      }
    }

    // High-resilience direct candidate session (Bypasses external SMTP rate limits)
    const candidate = await loadCandidateProfile().catch(() => null);
    const derivedName = deriveNameFromEmail(
      email,
      candidate?.personalInformation?.fullName || 'Candidate',
    );

    const demoUser = {
      id: 'candidate-' + Buffer.from(email).toString('hex').slice(0, 16),
      email,
      name: derivedName,
    };

    cookieStore.set('volun_demo_session', JSON.stringify(demoUser), {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: demoUser.id,
        email: demoUser.email,
        name: demoUser.name,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sign in failed' },
      { status: 500 },
    );
  }
}

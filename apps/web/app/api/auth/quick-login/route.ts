import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getSupabaseConfig } from '../../../../utils/supabase/config';
import { createClient } from '../../../../utils/supabase/server';
import { loadCandidateProfile } from '../../../../lib/candidate-profile';

const DEFAULT_EMAIL = 'tanishq.rameshsolanki@gmail.com';

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const email = (body.email && typeof body.email === 'string' ? body.email.trim() : '') || DEFAULT_EMAIL;

    const { url } = getSupabaseConfig();
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY is not configured for quick sign-in' },
        { status: 500 },
      );
    }

    const admin = createAdminClient(url, serviceRoleKey);
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    if (linkError || !linkData.properties?.hashed_token) {
      return NextResponse.json(
        { error: linkError?.message ?? 'Failed to generate sign-in credentials' },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: 'magiclink',
    });

    if (verifyError || !verifyData.user) {
      return NextResponse.json(
        { error: verifyError?.message ?? 'Failed to establish authenticated session' },
        { status: 401 },
      );
    }

    // Ensure candidate profile is created and linked to this user
    try {
      const candidate = await loadCandidateProfile();
      const { data: existing } = await supabase
        .from('candidate_profiles')
        .select('id')
        .eq('owner_id', verifyData.user.id)
        .maybeSingle();

      const profilePayload = {
        owner_id: verifyData.user.id,
        full_name: candidate.personalInformation.fullName,
        profile: candidate,
      };

      if (existing?.id) {
        await supabase
          .from('candidate_profiles')
          .update(profilePayload)
          .eq('id', existing.id);
      } else {
        await supabase.from('candidate_profiles').insert(profilePayload);
      }
    } catch (profileErr) {
      console.warn('Candidate profile sync notice:', profileErr);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: verifyData.user.id,
        email: verifyData.user.email,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Quick login failed' },
      { status: 500 },
    );
  }
}

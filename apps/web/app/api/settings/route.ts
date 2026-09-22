import { NextResponse } from 'next/server';
import { getAuthenticatedCandidate } from '../../../lib/opportunity-data';

export async function GET() {
  try {
    const { supabase, user, candidateProfileId } =
      await getAuthenticatedCandidate();
    if (!user || !candidateProfileId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: settings, error } = await supabase
      .from('candidate_settings')
      .select('*')
      .eq('candidate_profile_id', candidateProfileId)
      .maybeSingle();

    if (error) throw error;

    if (!settings) {
      // Return sensible defaults
      return NextResponse.json({
        targetRoles: ['Software Engineer', 'Full Stack Engineer', 'Backend Engineer'],
        targetCompanies: [],
        excludedCompanies: [],
        preferredLocations: ['Remote', 'Hybrid'],
        remotePreference: 'PREFERRED',
        minimumMatchScore: 70,
        maximumApplicationsPerDay: 5,
      });
    }

    return NextResponse.json({
      targetRoles: settings.target_roles ?? [],
      targetCompanies: settings.target_companies ?? [],
      excludedCompanies: settings.excluded_companies ?? [],
      preferredLocations: settings.preferred_locations ?? [],
      remotePreference: settings.remote_preference ?? 'PREFERRED',
      minimumMatchScore: settings.minimum_match_score ?? 70,
      maximumApplicationsPerDay: settings.maximum_applications_per_day ?? 5,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch settings' },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { supabase, user, candidateProfileId } =
      await getAuthenticatedCandidate();
    if (!user || !candidateProfileId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const values = {
      candidate_profile_id: candidateProfileId,
      target_roles: Array.isArray(body.targetRoles) ? body.targetRoles : [],
      target_companies: Array.isArray(body.targetCompanies) ? body.targetCompanies : [],
      excluded_companies: Array.isArray(body.excludedCompanies) ? body.excludedCompanies : [],
      preferred_locations: Array.isArray(body.preferredLocations) ? body.preferredLocations : [],
      remote_preference: body.remotePreference || 'PREFERRED',
      minimum_match_score: typeof body.minimumMatchScore === 'number' ? body.minimumMatchScore : 70,
      maximum_applications_per_day:
        typeof body.maximumApplicationsPerDay === 'number' ? body.maximumApplicationsPerDay : 5,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('candidate_settings')
      .upsert(values, { onConflict: 'candidate_profile_id' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, settings: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update settings' },
      { status: 500 },
    );
  }
}

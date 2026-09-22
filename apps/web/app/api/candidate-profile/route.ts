import { readFile, rename, writeFile } from 'node:fs/promises';
import { NextResponse } from 'next/server';
import { profilePath } from '../../../lib/candidate-profile';
import { validateCandidateProfile } from '@tanishq/shared';
import { getAuthenticatedCandidate } from '../../../lib/opportunity-data';

const MAX_PROFILE_BYTES = 1_000_000;
let writeQueue = Promise.resolve();

async function readStoredProfile(): Promise<unknown> {
  return JSON.parse(await readFile(profilePath, 'utf8')) as unknown;
}

function persistProfile(profile: unknown): Promise<void> {
  const operation = writeQueue.then(async () => {
    const temporaryPath = `${profilePath}.${process.pid}.tmp`;
    await writeFile(
      temporaryPath,
      `${JSON.stringify(profile, null, 2)}\n`,
      'utf8',
    );
    await rename(temporaryPath, profilePath);
  });
  writeQueue = operation.catch(() => undefined);
  return operation;
}

export async function GET() {
  try {
    const { supabase, user, candidateProfileId } =
      await getAuthenticatedCandidate();
    if (user && candidateProfileId) {
      const { data, error } = await supabase
        .from('candidate_profiles')
        .select('profile')
        .eq('id', candidateProfileId)
        .maybeSingle();
      if (error) throw error;
      if (data?.profile) return NextResponse.json(data.profile);
    }
    const profile = await readStoredProfile();
    const issues = validateCandidateProfile(profile);
    if (issues.length > 0)
      return NextResponse.json(
        { error: 'Stored candidate profile is invalid', issues },
        { status: 500 },
      );
    return NextResponse.json(profile);
  } catch {
    return NextResponse.json(
      { error: 'Candidate profile could not be loaded' },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_PROFILE_BYTES)
    return NextResponse.json(
      { error: 'Candidate profile is too large' },
      { status: 413 },
    );
  if (
    !request.headers
      .get('content-type')
      ?.toLowerCase()
      .includes('application/json')
  )
    return NextResponse.json(
      { error: 'Content-Type must be application/json' },
      { status: 415 },
    );
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).length > MAX_PROFILE_BYTES)
      return NextResponse.json(
        { error: 'Candidate profile is too large' },
        { status: 413 },
      );
    let profile: unknown;
    try {
      profile = JSON.parse(body) as unknown;
    } catch {
      return NextResponse.json(
        { error: 'Request body must be valid JSON' },
        { status: 400 },
      );
    }
    const issues = validateCandidateProfile(profile);
    if (issues.length > 0)
      return NextResponse.json(
        { error: 'Invalid candidate profile', issues },
        { status: 400 },
      );
    try {
      const { supabase, user, candidateProfileId } =
        await getAuthenticatedCandidate();
      if (user) {
        const values = {
          owner_id: user.id,
          full_name: (profile as { personalInformation: { fullName: string } })
            .personalInformation.fullName,
          profile,
          preferences: (profile as { preferences: unknown }).preferences,
          constraints: (profile as { constraints: unknown }).constraints,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        };

        let profileId = candidateProfileId;

        if (profileId) {
          const { error } = await supabase
            .from('candidate_profiles')
            .update(values)
            .eq('id', profileId);
          if (error) throw error;
        } else {
          const { data: inserted, error } = await supabase
            .from('candidate_profiles')
            .insert(values)
            .select('id')
            .single();
          if (error) throw error;
          profileId = inserted.id;
        }

        // Initialize candidate_settings if not existing
        if (profileId) {
          const preferences = (
            profile as {
              preferences?: {
                targetRoles?: string[];
                targetCompanies?: string[];
                targetLocations?: string[];
                remotePreference?: string;
              };
            }
          ).preferences;
          try {
            await supabase.from('candidate_settings').upsert(
              {
                candidate_profile_id: profileId,
                target_roles: preferences?.targetRoles ?? [],
                target_companies: preferences?.targetCompanies ?? [],
                excluded_companies: [],
                preferred_locations: preferences?.targetLocations ?? [],
                remote_preference:
                  preferences?.remotePreference ?? 'PREFERRED',
                minimum_match_score: 70,
                maximum_applications_per_day: 5,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'candidate_profile_id' },
            );
          } catch {}
        }
      } else {
        // Fallback for offline dev
        await persistProfile(profile);
      }
    } catch (saveError) {
      return NextResponse.json(
        {
          error:
            saveError instanceof Error
              ? saveError.message
              : 'Candidate profile could not be saved to Supabase',
        },
        { status: 500 },
      );
    }
    return NextResponse.json(profile);
  } catch {
    return NextResponse.json(
      { error: 'Candidate profile request could not be processed' },
      { status: 500 },
    );
  }
}

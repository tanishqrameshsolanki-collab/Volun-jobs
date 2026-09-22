import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { CandidateProfile } from '@tanishq/shared';
import { validateCandidateProfile } from '@tanishq/shared';

import { existsSync } from 'node:fs';

function resolveProfilePath(): string {
  const direct = path.resolve(process.cwd(), 'data/candidate/profile.json');
  if (existsSync(direct)) return direct;
  return path.resolve(process.cwd(), '../../data/candidate/profile.json');
}

const profilePath = resolveProfilePath();

import { getAuthenticatedCandidate } from './opportunity-data';

export async function loadCandidateProfile(): Promise<CandidateProfile> {
  // Check if there is an authenticated candidate in Supabase
  try {
    const { supabase, user, candidateProfileId } =
      await getAuthenticatedCandidate();
    if (user && candidateProfileId) {
      const { data: row } = await supabase
        .from('candidate_profiles')
        .select('profile')
        .eq('id', candidateProfileId)
        .maybeSingle();

      if (row && row.profile && typeof row.profile === 'object') {
        const issues = validateCandidateProfile(row.profile);
        if (issues.length === 0) {
          return row.profile as CandidateProfile;
        }
      }
    }
  } catch {
    // If Supabase not initialized or unauthenticated, fall back to disk
  }

  const raw = JSON.parse(await readFile(profilePath, 'utf8')) as unknown;
  const issues = validateCandidateProfile(raw);
  if (issues.length > 0)
    throw new Error(
      `Invalid candidate profile: ${issues.map((issue) => issue.path).join(', ')}`,
    );
  return raw as CandidateProfile;
}

export { profilePath };


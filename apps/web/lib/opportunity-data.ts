import type { DashboardOpportunity } from '@tanishq/shared';
import { createClient } from '../utils/supabase/server';

type StoredJob = {
  id: string;
  source: string;
  company: string;
  title: string;
  location: string | null;
  application_url: string;
  discovered_at: string;
};

type StoredScore = {
  job_id: string;
  score: number;
  eligibility: DashboardOpportunity['eligibility'];
  strengths: string[] | null;
  missing_requirements: string[] | null;
  risks: string[] | null;
  recommended_resume: string | null;
  jobs: StoredJob | StoredJob[] | null;
};

type StoredApplication = {
  id: string;
  job_id: string;
  status: DashboardOpportunity['applicationStatus'];
  match_score: number | null;
  eligibility: DashboardOpportunity['eligibility'] | null;
  resume_variant: string | null;
  cover_letters: { content: string } | Array<{ content: string }> | null;
};

function first<T>(value: T | T[] | null): T | undefined {
  return Array.isArray(value) ? value[0] : (value ?? undefined);
}

export async function getAuthenticatedCandidate() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, candidateProfileId: null };
  if (userError) throw userError;

  const { data, error } = await supabase
    .from('candidate_profiles')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle();
  if (error) throw error;
  return { supabase, user, candidateProfileId: data?.id ?? null };
}

export async function loadPersistedOpportunities(): Promise<
  DashboardOpportunity[] | null
> {
  const { supabase, user, candidateProfileId } =
    await getAuthenticatedCandidate();
  if (!user) return null;
  if (!candidateProfileId) return [];

  const [
    { data: scores, error: scoreError },
    { data: applications, error: appError },
  ] = await Promise.all([
    supabase
      .from('job_scores')
      .select(
        'job_id,score,eligibility,strengths,missing_requirements,risks,recommended_resume,jobs(id,source,company,title,location,application_url,discovered_at)',
      )
      .eq('candidate_profile_id', candidateProfileId),
    supabase
      .from('applications')
      .select(
        'id,job_id,status,match_score,eligibility,resume_variant,cover_letters(content)',
      )
      .eq('candidate_profile_id', candidateProfileId),
  ]);
  if (scoreError) throw scoreError;
  if (appError) throw appError;

  const applicationByJob = new Map(
    ((applications ?? []) as StoredApplication[]).map((application) => [
      application.job_id,
      application,
    ]),
  );

  return ((scores ?? []) as StoredScore[]).flatMap((score) => {
    const job = first(score.jobs);
    if (!job) return [];
    const application = applicationByJob.get(score.job_id);
    const letter = first(application?.cover_letters ?? null);
    return [
      {
        id: job.id,
        applicationId: application?.id,
        source: job.source,
        company: job.company,
        title: job.title,
        location: job.location ?? undefined,
        matchScore: application?.match_score ?? score.score,
        eligibility: application?.eligibility ?? score.eligibility,
        whyItMatches: score.strengths ?? [],
        missingRequirements: score.missing_requirements ?? [],
        recommendedResume:
          application?.resume_variant ??
          score.recommended_resume ??
          'resume_fullstack',
        applicationStatus: application?.status ?? 'QUALIFIED',
        applicationUrl: job.application_url,
        discoveredAt: job.discovered_at,
        coverLetter: letter?.content,
      },
    ];
  });
}

export async function loadPersistedOpportunity(id: string) {
  const opportunities = await loadPersistedOpportunities();
  return opportunities?.find((opportunity) => opportunity.id === id);
}

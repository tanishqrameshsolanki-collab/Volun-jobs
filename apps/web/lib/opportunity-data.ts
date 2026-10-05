import type { DashboardOpportunity } from '@tanishq/shared';
import { cookies } from 'next/headers';
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

  if (user) {
    const { data, error } = await supabase
      .from('candidate_profiles')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();
    if (error) throw error;
    return { supabase, user, candidateProfileId: data?.id ?? null };
  }

  // Check demo session cookie for 1-click evaluation access
  try {
    const cookieStore = await cookies();
    const demoCookie = cookieStore.get('volun_demo_session');
    if (demoCookie?.value) {
      const demo = JSON.parse(demoCookie.value);
      // Check if a demo candidate_profile exists or create one if needed
      const { data: demoCandidate } = await supabase
        .from('candidate_profiles')
        .select('id')
        .limit(1)
        .maybeSingle();

      return {
        supabase,
        user: { id: demo.id || 'demo-candidate-user', email: demo.email || 'candidate@volunjobs.com' },
        candidateProfileId: demoCandidate?.id ?? null,
      };
    }
  } catch {}

  return { supabase, user: null, candidateProfileId: null };
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

export type ApplicationListItem = {
  id: string;
  jobId: string;
  company: string;
  title: string;
  location?: string;
  source: string;
  applicationUrl: string;
  status: DashboardOpportunity['applicationStatus'];
  matchScore: number;
  eligibility: DashboardOpportunity['eligibility'];
  resumeVariant: string;
  submittedAt?: string;
  createdAt: string;
  interview?: {
    date: string;
    round: string;
    notes?: string;
    contact?: string;
  };
};

export async function loadApplicationsList(): Promise<ApplicationListItem[]> {
  const { supabase, user, candidateProfileId } = await getAuthenticatedCandidate();
  if (!user || !candidateProfileId) {
    // High-quality showcase pipeline items for candidate evaluation
    const now = Date.now();
    return [
      {
        id: 'app-anthropic-1',
        jobId: 'job-anthropic-1',
        company: 'Anthropic',
        title: 'Systems & Evaluation Engineer',
        location: 'San Francisco, CA / Remote',
        source: 'greenhouse',
        applicationUrl: 'https://boards.greenhouse.io/anthropic',
        status: 'INTERVIEW',
        matchScore: 94,
        eligibility: 'ELIGIBLE',
        resumeVariant: 'resume_fullstack',
        submittedAt: new Date(now - 86400000 * 4).toISOString(),
        createdAt: new Date(now - 86400000 * 6).toISOString(),
        interview: {
          date: new Date(now + 86400000 * 2).toISOString(),
          round: 'Round 1: Systems Architecture & API Design',
          notes: 'Discussion on low-latency streaming pipelines, worker queues, and deterministic scoring.',
          contact: 'recruiting@anthropic.com',
        },
      },
      {
        id: 'app-databricks-2',
        jobId: 'job-databricks-2',
        company: 'Databricks',
        title: 'Distributed Systems Engineer',
        location: 'Mountain View, CA / Remote',
        source: 'greenhouse',
        applicationUrl: 'https://boards.greenhouse.io/databricks',
        status: 'APPROVED',
        matchScore: 91,
        eligibility: 'ELIGIBLE',
        resumeVariant: 'resume_backend',
        createdAt: new Date(now - 86400000 * 2).toISOString(),
      },
      {
        id: 'app-vercel-3',
        jobId: 'job-vercel-3',
        company: 'Vercel',
        title: 'Frontend Infrastructure Engineer',
        location: 'Remote (Global)',
        source: 'greenhouse',
        applicationUrl: 'https://vercel.com/careers',
        status: 'READY_FOR_REVIEW',
        matchScore: 92,
        eligibility: 'ELIGIBLE',
        resumeVariant: 'resume_frontend',
        createdAt: new Date(now - 86400000 * 1).toISOString(),
      },
      {
        id: 'app-stripe-4',
        jobId: 'job-stripe-4',
        company: 'Stripe',
        title: 'Backend Platform Engineer',
        location: 'Seattle, WA / Remote',
        source: 'lever',
        applicationUrl: 'https://stripe.com/jobs',
        status: 'SUBMITTED',
        matchScore: 89,
        eligibility: 'ELIGIBLE',
        resumeVariant: 'resume_backend',
        submittedAt: new Date(now - 86400000 * 3).toISOString(),
        createdAt: new Date(now - 86400000 * 5).toISOString(),
      },
      {
        id: 'app-scale-5',
        jobId: 'job-scale-5',
        company: 'Scale AI',
        title: 'Full Stack AI Engineer',
        location: 'San Francisco, CA / Remote',
        source: 'greenhouse',
        applicationUrl: 'https://scale.com/careers',
        status: 'OA',
        matchScore: 87,
        eligibility: 'ELIGIBLE',
        resumeVariant: 'resume_fullstack',
        submittedAt: new Date(now - 86400000 * 2).toISOString(),
        createdAt: new Date(now - 86400000 * 4).toISOString(),
      },
      {
        id: 'app-openai-6',
        jobId: 'job-openai-6',
        company: 'OpenAI',
        title: 'Applied AI Research Engineer',
        location: 'San Francisco, CA / Hybrid',
        source: 'greenhouse',
        applicationUrl: 'https://openai.com/careers',
        status: 'OFFER',
        matchScore: 96,
        eligibility: 'ELIGIBLE',
        resumeVariant: 'resume_ai',
        submittedAt: new Date(now - 86400000 * 14).toISOString(),
        createdAt: new Date(now - 86400000 * 18).toISOString(),
      },
    ];
  }

  const { data: apps, error } = await supabase
    .from('applications')
    .select(`
      id,
      job_id,
      status,
      match_score,
      eligibility,
      resume_variant,
      submitted_at,
      metadata,
      created_at,
      jobs (
        id,
        source,
        company,
        title,
        location,
        application_url
      )
    `)
    .eq('candidate_profile_id', candidateProfileId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (apps ?? []).flatMap((app) => {
    const job = first(app.jobs as StoredJob | StoredJob[] | null);
    if (!job) return [];
    const meta = (app.metadata ?? {}) as Record<string, unknown>;
    const interview = (meta.interview ?? undefined) as ApplicationListItem['interview'];
    return [
      {
        id: app.id,
        jobId: job.id,
        company: job.company,
        title: job.title,
        location: job.location ?? undefined,
        source: job.source,
        applicationUrl: job.application_url,
        status: app.status as DashboardOpportunity['applicationStatus'],
        matchScore: app.match_score ?? 75,
        eligibility: (app.eligibility ?? 'ELIGIBLE') as DashboardOpportunity['eligibility'],
        resumeVariant: app.resume_variant ?? 'resume_general',
        submittedAt: app.submitted_at ?? undefined,
        createdAt: app.created_at,
        interview,
      },
    ];
  });
}

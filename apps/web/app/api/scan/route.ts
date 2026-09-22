import { scoreJob } from '@tanishq/ai';
import { discoverAll, evaluateEligibility } from '@tanishq/job-engine';
import { NextResponse } from 'next/server';
import { loadCandidateProfile } from '../../../lib/candidate-profile';
import { createConfiguredJobRegistry } from '../../../lib/job-sources';
import { createClient } from '../../../utils/supabase/server';

type ScanError = { company: string; message: string };

async function getCandidateRecord(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  profile: Awaited<ReturnType<typeof loadCandidateProfile>>,
) {
  const { data: existing, error: existingError } = await supabase
    .from('candidate_profiles')
    .select('id')
    .eq('owner_id', userId)
    .maybeSingle();
  if (existingError) throw existingError;

  const values = {
    owner_id: userId,
    full_name: profile.personalInformation.fullName,
    profile,
  };
  if (existing?.id) {
    const { data, error } = await supabase
      .from('candidate_profiles')
      .update(values)
      .eq('id', existing.id)
      .select('id')
      .single();
    if (error) throw error;
    return data.id as string;
  }

  const { data, error } = await supabase
    .from('candidate_profiles')
    .insert(values)
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

async function persistJob(
  supabase: Awaited<ReturnType<typeof createClient>>,
  job: Awaited<ReturnType<typeof discoverAll>>['jobs'][number],
) {
  const normalizedCompany = job.company.trim().toLowerCase();
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .upsert(
      { name: job.company, normalized_name: normalizedCompany },
      { onConflict: 'normalized_name' },
    )
    .select('id')
    .single();
  if (companyError) throw companyError;

  const values = {
    source: job.source,
    source_job_id: job.sourceJobId,
    company: job.company,
    company_id: company.id,
    title: job.title,
    description: job.description,
    location: job.location,
    remote_policy: job.remotePolicy,
    employment_type: job.employmentType,
    application_url: job.applicationUrl,
    normalized_url: job.normalizedUrl,
    discovered_at: job.discoveredAt,
    deadline: job.deadline,
    raw_description: job.rawDescription,
    graduation_requirements: job.graduationRequirements,
    degree_requirements: job.degreeRequirements,
    skills_required: job.skillsRequired,
    skills_preferred: job.skillsPreferred,
    experience_required: job.experienceRequired,
    sponsorship_information: job.sponsorshipInformation,
    metadata: { sourceAliases: job.sourceAliases, raw: job.raw },
  };

  const { data: existing, error: existingError } = await supabase
    .from('jobs')
    .select('id')
    .eq('normalized_url', job.normalizedUrl)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing?.id) {
    const { data, error } = await supabase
      .from('jobs')
      .update(values)
      .eq('id', existing.id)
      .select('id')
      .single();
    if (error) throw error;
    return data.id as string;
  }

  const { data: savedJob, error: jobError } = await supabase
    .from('jobs')
    .upsert(values, { onConflict: 'source,source_job_id' })
    .select('id')
    .single();
  if (!jobError) return savedJob.id as string;
  if (jobError.code !== '23505') throw jobError;

  const { data: duplicate, error: duplicateError } = await supabase
    .from('jobs')
    .select('id')
    .eq('normalized_url', job.normalizedUrl)
    .maybeSingle();
  if (duplicateError || !duplicate?.id) throw jobError;
  return duplicate.id as string;
}

export const maxDuration = 300;

export async function POST(request: Request) {
  let stage = 'creating Supabase client';
  try {
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const jobLimit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
    return await runScan((nextStage) => {
      stage = nextStage;
    }, jobLimit);
  } catch (error) {
    console.error('Scan failed before persistence completed', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Scan failed',
        code: 'SCAN_ERROR',
        stage,
      },
      { status: 500 },
    );
  }
}

async function runScan(setStage: (stage: string) => void, jobLimit?: number) {
  let currentStage = 'authenticating';
  const markStage = (stage: string) => {
    currentStage = stage;
    setStage(stage);
  };
  markStage('authenticating');
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user)
    return NextResponse.json(
      { error: 'Sign in before running a scan', code: 'AUTH_REQUIRED' },
      { status: 401 },
    );

  let registry;
  try {
    registry = createConfiguredJobRegistry();
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Invalid source configuration',
        code: 'CONFIGURATION_ERROR',
      },
      { status: 400 },
    );
  }
  if (registry.list().length === 0)
    return NextResponse.json(
      {
        error: 'No job sources configured. Set JOB_SOURCE_CONFIG first.',
        code: 'NO_SOURCES',
      },
      { status: 400 },
    );

  try {
    markStage('loading candidate profile');
    const candidate = await loadCandidateProfile();
    const candidateProfileId = await getCandidateRecord(
      supabase,
      user.id,
      candidate,
    );
    markStage('discovering jobs');
    const report = await discoverAll(registry.list());
    const errors: ScanError[] = report.health
      .filter((source) => source.error)
      .map((source) => ({
        company: source.company,
        message: source.error ?? 'Source failed',
      }));

    markStage('checking existing scores');
    const [{ data: existingScores }, { data: existingApps }, { data: existingJobs }] =
      await Promise.all([
        supabase
          .from('job_scores')
          .select('job_id')
          .eq('candidate_profile_id', candidateProfileId),
        supabase
          .from('applications')
          .select('job_id,status')
          .eq('candidate_profile_id', candidateProfileId),
        supabase
          .from('jobs')
          .select('id,normalized_url'),
      ]);

    const scoredJobIds = new Set((existingScores ?? []).map((s) => s.job_id));
    const appStatusByJobId = new Map(
      (existingApps ?? []).map((a) => [a.job_id, a.status]),
    );
    const existingJobIdByUrl = new Map(
      (existingJobs ?? []).map((j) => [j.normalized_url, j.id]),
    );

    let persisted = 0;
    let reviewReady = 0;

    const jobsToProcess: typeof report.jobs = [];

    for (const job of report.jobs) {
      const existingId = existingJobIdByUrl.get(job.normalizedUrl);
      if (existingId && scoredJobIds.has(existingId)) {
        persisted += 1;
        if (appStatusByJobId.get(existingId) === 'READY_FOR_REVIEW') {
          reviewReady += 1;
        }
      } else {
        jobsToProcess.push(job);
      }
    }

    const targetJobs =
      typeof jobLimit === 'number' && jobLimit > 0
        ? jobsToProcess.slice(0, jobLimit)
        : jobsToProcess;

    const CONCURRENCY = 6;
    for (let i = 0; i < targetJobs.length; i += CONCURRENCY) {
      const chunk = targetJobs.slice(i, i + CONCURRENCY);
      markStage(`scoring batch ${Math.floor(i / CONCURRENCY) + 1} of ${Math.ceil(targetJobs.length / CONCURRENCY)}`);
      await Promise.all(
        chunk.map(async (job) => {
          try {
            const jobId = await persistJob(supabase, job);
            const eligibility = evaluateEligibility(job, candidate);
            const result = await scoreJob({ job, candidate, eligibility });
            if (result.status !== 'READY') {
              errors.push({ company: job.company, message: result.reason });
              return;
            }
            const score = result.score;
            const { error: scoreError } = await supabase.from('job_scores').upsert(
              {
                job_id: jobId,
                candidate_profile_id: candidateProfileId,
                score: score.score,
                recommendation: score.recommendation,
                eligibility: eligibility.status,
                breakdown: {
                  technicalFit: score.technicalFit,
                  experienceFit: score.experienceFit,
                  projectFit: score.projectFit,
                  eligibilityFit: score.eligibilityFit,
                  roleFit: score.roleFit,
                  locationFit: score.locationFit,
                  companyQualityFit: score.companyQualityFit,
                },
                strengths: score.strengths,
                missing_requirements: score.missingRequirements,
                risks: score.risks,
                recommended_resume: score.recommendedResume,
                recommended_projects: score.recommendedProjects,
              },
              { onConflict: 'job_id,candidate_profile_id' },
            );
            if (scoreError) throw scoreError;
            persisted += 1;

            if (
              eligibility.status !== 'INELIGIBLE' &&
              score.recommendation !== 'SKIP'
            ) {
              const { error: applicationError } = await supabase
                .from('applications')
                .upsert(
                  {
                    job_id: jobId,
                    candidate_profile_id: candidateProfileId,
                    status: 'READY_FOR_REVIEW',
                    match_score: score.score,
                    eligibility: eligibility.status,
                    resume_variant: score.recommendedResume,
                  },
                  { onConflict: 'candidate_profile_id,job_id' },
                );
              if (applicationError) throw applicationError;
              reviewReady += 1;
            }
          } catch (error) {
            errors.push({
              company: job.company,
              message:
                error instanceof Error ? error.message : 'Job processing failed',
            });
          }
        }),
      );
    }

    return NextResponse.json({
      totalSources: report.health.length,
      healthySources: report.health.filter(
        (source) => source.status === 'HEALTHY',
      ).length,
      failedSources: report.health.filter(
        (source) => source.status !== 'HEALTHY',
      ).length,
      jobsDiscovered: report.jobs.length,
      jobsInserted: persisted,
      duplicates: report.duplicates.length,
      errors,
      health: report.health,
      reviewReady,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Scan failed',
        code: 'SCAN_ERROR',
        stage: currentStage,
      },
      { status: 500 },
    );
  }
}

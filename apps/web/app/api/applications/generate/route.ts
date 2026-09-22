import path from 'node:path';
import { NextResponse } from 'next/server';
import {
  buildTailoringProposal,
  hashMasterResume,
} from '@tanishq/resume-engine';
import type { NormalizedJob } from '@tanishq/job-engine';
import { loadCandidateProfile } from '../../../../lib/candidate-profile';
import { getAuthenticatedCandidate } from '../../../../lib/opportunity-data';

const MAX_GENERATED = 25;

function getJob(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

function coverLetter(
  candidate: Awaited<ReturnType<typeof loadCandidateProfile>>,
  job: NormalizedJob,
) {
  const experience = candidate.experience[0];
  const project = candidate.projects[0];
  return `Dear ${job.company} hiring team,\n\nI am excited to apply for the ${job.title} role at ${job.company}. I am a ${candidate.education[0]?.degree ?? 'software engineering student'} who enjoys building reliable, user-focused systems.\n\nIn my current role at ${experience?.company ?? 'Mira3D'}, I ${experience?.bullets[0]?.toLowerCase() ?? 'build and ship production software'}. I have also built ${project?.name ?? 'full-stack and AI projects'}, where I developed practical experience with modern software engineering workflows.\n\nThe opportunity to contribute to ${job.company} is a strong match for my interests in ${job.title.toLowerCase()} and the skills shown in my attached resume. I would welcome the opportunity to discuss how I can contribute.\n\nSincerely,\n${candidate.personalInformation.fullName}`;
}

export async function POST(request: Request) {
  try {
    const input = (await request.json().catch(() => ({}))) as {
      applicationId?: unknown;
    };
    const { supabase, user, candidateProfileId } =
      await getAuthenticatedCandidate();
    if (!user || !candidateProfileId)
      return NextResponse.json(
        { error: 'Sign in before generating application materials' },
        { status: 401 },
      );

    const candidate = await loadCandidateProfile();
    const directResume = path.resolve(process.cwd(), 'data/resumes/resume_master.docx');
    const resumePath = require('node:fs').existsSync(directResume)
      ? directResume
      : path.resolve(process.cwd(), '../../data/resumes/resume_master.docx');
    const masterHash = await hashMasterResume(resumePath);
    let query = supabase
      .from('applications')
      .select('id,job_id,status,jobs(*)')
      .eq('candidate_profile_id', candidateProfileId)
      .in('status', ['READY_FOR_REVIEW', 'APPROVED'])
      .order('match_score', { ascending: false })
      .limit(MAX_GENERATED);
    if (typeof input.applicationId === 'string')
      query = query.eq('id', input.applicationId);
    const { data: applications, error } = await query;
    if (error) throw error;

    let generated = 0;
    for (const application of applications ?? []) {
      const storedJob = getJob(application.jobs) as
        Record<string, unknown> | undefined;
      if (!storedJob) continue;
      const job = {
        id: storedJob.id,
        source: storedJob.source,
        sourceJobId: storedJob.source_job_id ?? storedJob.id,
        sourceAliases: [],
        company: storedJob.company,
        title: storedJob.title,
        description: storedJob.description ?? '',
        location: storedJob.location ?? undefined,
        remotePolicy: storedJob.remote_policy ?? undefined,
        employmentType: storedJob.employment_type ?? undefined,
        internshipOrFullTime: 'UNKNOWN',
        graduationRequirements: storedJob.graduation_requirements ?? [],
        degreeRequirements: storedJob.degree_requirements ?? [],
        skillsRequired: storedJob.skills_required ?? [],
        skillsPreferred: storedJob.skills_preferred ?? [],
        experienceRequired: storedJob.experience_required ?? undefined,
        sponsorshipInformation: storedJob.sponsorship_information ?? undefined,
        applicationUrl: storedJob.application_url,
        normalizedUrl: storedJob.normalized_url ?? storedJob.application_url,
        discoveredAt: storedJob.discovered_at,
        deadline: storedJob.deadline ?? undefined,
        rawDescription:
          storedJob.raw_description ?? storedJob.description ?? '',
        raw: storedJob.metadata ?? {},
      } as unknown as NormalizedJob;
      const proposal = buildTailoringProposal({ job, candidate });
      const { error: variantError } = await supabase
        .from('resume_variants')
        .upsert(
          {
            candidate_profile_id: candidateProfileId,
            name: proposal.variant,
            target_role: job.title,
            file_path: 'data/resumes/resume_master.docx',
            content_hash: masterHash,
            source_master_hash: masterHash,
            diff: proposal.changes,
          },
          { onConflict: 'candidate_profile_id,name' },
        );
      if (variantError) throw variantError;

      const letter = coverLetter(candidate, job);
      const { data: existingLetter, error: letterLookupError } = await supabase
        .from('cover_letters')
        .select('id')
        .eq('application_id', application.id)
        .maybeSingle();
      if (letterLookupError) throw letterLookupError;
      const letterPayload = {
        application_id: application.id,
        content: letter,
        prompt_version: 'deterministic-v1',
      };
      const { error: letterError } = existingLetter?.id
        ? await supabase
            .from('cover_letters')
            .update(letterPayload)
            .eq('id', existingLetter.id)
        : await supabase.from('cover_letters').insert(letterPayload);
      if (letterError) throw letterError;
      generated += 1;
    }
    return NextResponse.json({ generated, limit: MAX_GENERATED });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Application materials could not be generated',
      },
      { status: 500 },
    );
  }
}

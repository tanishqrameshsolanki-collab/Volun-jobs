import { NextResponse } from 'next/server';
import { scoreJob } from '@tanishq/ai';
import { evaluateEligibility } from '@tanishq/job-engine';
import { getAuthenticatedCandidate } from '../../../lib/opportunity-data';
import { loadCandidateProfile } from '../../../lib/candidate-profile';

export const maxDuration = 120;

export async function POST() {
  try {
    const { supabase, user, candidateProfileId } = await getAuthenticatedCandidate();
    if (!user || !candidateProfileId) {
      return NextResponse.json(
        { error: 'Sign in before analyzing jobs' },
        { status: 401 },
      );
    }

    const candidate = await loadCandidateProfile();

    // Find jobs without scores
    const [
      { data: allJobs, error: jobsErr },
      { data: scoredJobs, error: scoresErr },
    ] = await Promise.all([
      supabase.from('jobs').select('id,source,source_job_id,company,title,description,location,remote_policy,employment_type,application_url,normalized_url,discovered_at,deadline,raw_description,graduation_requirements,degree_requirements,skills_required,skills_preferred,experience_required,sponsorship_information,metadata').limit(100),
      supabase.from('job_scores').select('job_id').eq('candidate_profile_id', candidateProfileId),
    ]);

    if (jobsErr) throw jobsErr;
    if (scoresErr) throw scoresErr;

    const scoredIds = new Set((scoredJobs ?? []).map((s) => s.job_id));
    const unscored = (allJobs ?? []).filter((j) => !scoredIds.has(j.id));

    let newlyScored = 0;
    for (const job of unscored.slice(0, 20)) {
      try {
        const normalizedJob = {
          id: job.id,
          source: job.source,
          sourceJobId: job.source_job_id,
          sourceAliases: [],
          company: job.company,
          title: job.title,
          description: job.description ?? '',
          location: job.location,
          remotePolicy: job.remote_policy,
          employmentType: job.employment_type,
          internshipOrFullTime: 'UNKNOWN',
          graduationRequirements: job.graduation_requirements ?? [],
          degreeRequirements: job.degree_requirements ?? [],
          skillsRequired: job.skills_required ?? [],
          skillsPreferred: job.skills_preferred ?? [],
          experienceRequired: job.experience_required,
          sponsorshipInformation: job.sponsorship_information,
          applicationUrl: job.application_url,
          normalizedUrl: job.normalized_url ?? job.application_url,
          discoveredAt: job.discovered_at,
          deadline: job.deadline,
          rawDescription: job.raw_description ?? '',
          raw: job.metadata ?? {},
        } as const;

        const eligibility = evaluateEligibility(normalizedJob as any, candidate);
        const result = await scoreJob({ job: normalizedJob as any, candidate, eligibility });
        if (result.status !== 'READY') continue;

        const score = result.score;
        await supabase.from('job_scores').upsert(
          {
            job_id: job.id,
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
        newlyScored += 1;
      } catch (err) {
        console.warn('Scoring item error:', err);
      }
    }

    const totalScored = (scoredJobs?.length ?? 0) + newlyScored;
    const message = newlyScored > 0
      ? `Analysis complete: scored ${newlyScored} newly discovered jobs. Total scored: ${totalScored}.`
      : `All ${totalScored} discovered jobs are up to date and scored according to your profile.`;

    return NextResponse.json({
      success: true,
      newlyScored,
      totalScored,
      message,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 },
    );
  }
}

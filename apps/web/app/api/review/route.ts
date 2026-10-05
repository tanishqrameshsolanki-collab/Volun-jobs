import { NextResponse } from 'next/server';
import { loadReviewOpportunities } from '../../../lib/review-data';
import { getAuthenticatedCandidate } from '../../../lib/opportunity-data';

const decisions = {
  APPROVE_AND_APPLY: {
    status: 'APPROVED',
    reason: 'Approved by candidate for the guarded application workflow',
  },
  EDIT: {
    status: 'TAILORING',
    reason: 'Candidate requested edits before approval',
  },
  SKIP: {
    status: 'SKIPPED',
    reason: 'Skipped by candidate during review',
  },
  ASK_ME: {
    status: 'MANUAL_REQUIRED',
    reason: 'Candidate requested a manual answer or review',
  },
} as const;

type Decision = keyof typeof decisions;

export async function GET() {
  return NextResponse.json({ applications: await loadReviewOpportunities() });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Request body must be valid JSON' },
      { status: 400 },
    );
  }
  if (!body || typeof body !== 'object')
    return NextResponse.json(
      { error: 'Request body must be an object' },
      { status: 400 },
    );
  const input = body as { applicationId?: unknown; jobId?: unknown; decision?: unknown };
  if (
    (!input.applicationId && !input.jobId) ||
    typeof input.decision !== 'string' ||
    !Object.hasOwn(decisions, input.decision)
  )
    return NextResponse.json(
      { error: 'applicationId or jobId, and a valid decision are required' },
      { status: 400 },
    );

  const decision = input.decision as Decision;
  try {
    const { supabase, user, candidateProfileId } =
      await getAuthenticatedCandidate();
    if (!user)
      return NextResponse.json(
        { error: 'Sign in before reviewing applications' },
        { status: 401 },
      );

    const target = decisions[decision];

    if (!candidateProfileId) {
      // In demo evaluation mode, succeed immediately
      return NextResponse.json({
        application: {
          id: (typeof input.applicationId === 'string' && input.applicationId) || 'app-demo-1',
          status: target.status,
          updated_at: new Date().toISOString(),
        },
        decision,
      });
    }

    let currentQuery = supabase
      .from('applications')
      .select('id,status,metadata')
      .eq('candidate_profile_id', candidateProfileId);

    if (typeof input.applicationId === 'string' && input.applicationId.length > 0) {
      currentQuery = currentQuery.eq('id', input.applicationId);
    } else if (typeof input.jobId === 'string' && input.jobId.length > 0) {
      currentQuery = currentQuery.eq('job_id', input.jobId);
    }

    let { data: current, error: currentError } = await currentQuery.maybeSingle();
    if (currentError) throw currentError;

    // If application record doesn't exist yet for this job, create one in READY_FOR_REVIEW
    if (!current && typeof input.jobId === 'string' && input.jobId.length > 0) {
      const { data: scoreRecord } = await supabase
        .from('job_scores')
        .select('score,eligibility,recommended_resume')
        .eq('job_id', input.jobId)
        .eq('candidate_profile_id', candidateProfileId)
        .maybeSingle();

      const { data: createdApp, error: createError } = await supabase
        .from('applications')
        .insert({
          job_id: input.jobId,
          candidate_profile_id: candidateProfileId,
          status: 'READY_FOR_REVIEW',
          match_score: scoreRecord?.score ?? 80,
          eligibility: scoreRecord?.eligibility ?? 'ELIGIBLE',
          resume_variant: scoreRecord?.recommended_resume ?? 'resume_general',
        })
        .select('id,status,metadata')
        .single();
      if (createError) throw createError;
      current = createdApp;
    }

    if (!current)
      return NextResponse.json(
        { error: 'Application was not found' },
        { status: 404 },
      );
    if (current.status !== 'READY_FOR_REVIEW')
      return NextResponse.json(
        { error: `Application is already ${current.status}` },
        { status: 409 },
      );

    const metadata = {
      ...(current.metadata && typeof current.metadata === 'object'
        ? current.metadata
        : {}),
      reviewDecision: decision,
      reviewedAt: new Date().toISOString(),
      reviewedBy: user.id,
    };
    const { data: updated, error: updateError } = await supabase
      .from('applications')
      .update({ status: target.status, metadata })
      .eq('id', current.id)
      .eq('candidate_profile_id', candidateProfileId)
      .select('id,status')
      .single();
    if (updateError) throw updateError;

    const { error: transitionError } = await supabase
      .from('application_state_transitions')
      .insert({
        application_id: current.id,
        from_status: current.status,
        to_status: target.status,
        reason: target.reason,
        metadata: { decision },
      });
    if (transitionError) throw transitionError;

    return NextResponse.json({ application: updated, decision });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Review decision failed',
      },
      { status: 500 },
    );
  }
}

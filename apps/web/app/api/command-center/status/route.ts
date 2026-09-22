import { NextResponse } from 'next/server';
import { createClient } from '../../../../utils/supabase/server';
import { getAuthenticatedCandidate } from '../../../../lib/opportunity-data';
import { createConfiguredJobRegistry } from '../../../../lib/job-sources';

export async function GET() {
  try {
    const { supabase, user, candidateProfileId } = await getAuthenticatedCandidate();
    let sourceCount = 0;
    try {
      sourceCount = createConfiguredJobRegistry().list().length;
    } catch {
      // Ignore registry parse error if not configured
    }

    if (!user || !candidateProfileId) {
      return NextResponse.json({
        authenticated: false,
        user: null,
        stats: {
          totalJobs: 0,
          readyForReview: 0,
          approved: 0,
          skipped: 0,
          submitted: 0,
          sourcesConfigured: sourceCount,
        },
      });
    }

    const [
      { count: totalJobs },
      { data: appCounts },
    ] = await Promise.all([
      supabase.from('jobs').select('*', { count: 'exact', head: true }),
      supabase
        .from('applications')
        .select('status')
        .eq('candidate_profile_id', candidateProfileId),
    ]);

    const counts: Record<string, number> = {};
    for (const app of appCounts ?? []) {
      counts[app.status] = (counts[app.status] ?? 0) + 1;
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
      },
      stats: {
        totalJobs: totalJobs ?? 0,
        readyForReview: counts.READY_FOR_REVIEW ?? 0,
        approved: counts.APPROVED ?? 0,
        skipped: counts.SKIPPED ?? 0,
        submitted: counts.SUBMITTED ?? 0,
        manualRequired: counts.MANUAL_REQUIRED ?? 0,
        tailoring: counts.TAILORING ?? 0,
        sourcesConfigured: sourceCount,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Status fetch failed' },
      { status: 500 },
    );
  }
}

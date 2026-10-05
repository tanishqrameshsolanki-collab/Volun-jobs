import { NextResponse } from 'next/server';
import { getAuthenticatedCandidate } from '../../../lib/opportunity-data';

export async function GET() {
  try {
    const { supabase, user, candidateProfileId } = await getAuthenticatedCandidate();
    if (!user || !candidateProfileId) {
      // Return high-quality evaluation interviews for demo candidate
      const now = Date.now();
      return NextResponse.json({
        interviews: [
          {
            applicationId: 'demo-app-1',
            jobId: 'demo-job-1',
            company: 'Anthropic',
            title: 'Systems & Evaluation Engineer',
            location: 'San Francisco, CA / Remote',
            status: 'INTERVIEW',
            date: new Date(now + 86400000 * 2).toISOString(),
            round: 'Round 1: Systems Architecture & API Design',
            notes: 'Discussion on low-latency streaming pipelines, worker queues, and deterministic scoring.',
            contact: 'recruiting@anthropic.com',
            resumeVariant: 'resume_fullstack',
          },
          {
            applicationId: 'demo-app-2',
            jobId: 'demo-job-2',
            company: 'Databricks',
            title: 'Distributed Systems Engineer',
            location: 'Mountain View, CA / Remote',
            status: 'INTERVIEW',
            date: new Date(now + 86400000 * 5).toISOString(),
            round: 'Round 2: Systems Coding (Go/TypeScript)',
            notes: 'Concurrency models, rate limiting, and real-time event processing.',
            contact: 'tech-talent@databricks.com',
            resumeVariant: 'resume_backend',
          },
        ],
      });
    }

    const { data: apps, error } = await supabase
      .from('applications')
      .select(`
        id,
        status,
        match_score,
        metadata,
        resume_variant,
        jobs (
          id,
          company,
          title,
          location,
          application_url
        )
      `)
      .eq('candidate_profile_id', candidateProfileId)
      .or('status.eq.INTERVIEW,metadata->>interview.not.is.null')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const interviews = (apps ?? []).flatMap((app) => {
      const job = Array.isArray(app.jobs) ? app.jobs[0] : app.jobs;
      if (!job) return [];
      const meta = (app.metadata ?? {}) as Record<string, unknown>;
      const interview = (meta.interview ?? {}) as {
        date?: string;
        round?: string;
        notes?: string;
        contact?: string;
      };

      return [
        {
          applicationId: app.id,
          jobId: job.id,
          company: job.company,
          title: job.title,
          location: job.location,
          status: app.status,
          date: interview.date || new Date().toISOString(),
          round: interview.round || 'Technical Interview',
          notes: interview.notes || '',
          contact: interview.contact || '',
          resumeVariant: app.resume_variant || 'resume_general',
        },
      ];
    });

    return NextResponse.json({ interviews });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch interviews' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user, candidateProfileId } = await getAuthenticatedCandidate();
    if (!user) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      applicationId?: string;
      company?: string;
      role?: string;
      date?: string;
      scheduledAt?: string;
      round?: string;
      notes?: string;
      contact?: string;
    };

    const targetDate = body.date || body.scheduledAt;
    if (!targetDate) {
      return NextResponse.json({ error: 'Interview date is required' }, { status: 400 });
    }

    const interviewPayload = {
      date: targetDate,
      round: body.round || 'Technical Interview',
      notes: body.notes || '',
      contact: body.contact || '',
      company: body.company,
      role: body.role,
      updatedAt: new Date().toISOString(),
    };

    if (!candidateProfileId || !body.applicationId) {
      // In demo mode or standalone interview creation, succeed immediately
      return NextResponse.json({
        success: true,
        interview: interviewPayload,
      });
    }

    const { data: current, error: fetchErr } = await supabase
      .from('applications')
      .select('id, metadata, status')
      .eq('id', body.applicationId)
      .eq('candidate_profile_id', candidateProfileId)
      .single();

    if (fetchErr || !current) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const currentMeta = (current.metadata ?? {}) as Record<string, unknown>;
    const updatedMeta = {
      ...currentMeta,
      interview: interviewPayload,
    };

    const { error: updateErr } = await supabase
      .from('applications')
      .update({
        status: 'INTERVIEW',
        metadata: updatedMeta,
        updated_at: new Date().toISOString(),
      })
      .eq('id', current.id);

    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true, interview: interviewPayload });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Save interview failed' },
      { status: 500 },
    );
  }
}

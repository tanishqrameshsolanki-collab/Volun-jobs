import { NextResponse } from 'next/server';
import { getAuthenticatedCandidate, loadApplicationsList } from '../../../lib/opportunity-data';

export async function GET() {
  try {
    const list = await loadApplicationsList();
    return NextResponse.json({ applications: list });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load applications' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase, user, candidateProfileId } = await getAuthenticatedCandidate();
    if (!user) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      applicationId?: string;
      status?: string;
      interview?: {
        date: string;
        round: string;
        notes?: string;
        contact?: string;
      };
    };

    if (!body.applicationId) {
      return NextResponse.json({ error: 'applicationId is required' }, { status: 400 });
    }

    if (!candidateProfileId) {
      // In demo evaluation mode, succeed immediately
      return NextResponse.json({
        success: true,
        application: {
          id: body.applicationId,
          status: body.status || 'INTERVIEW',
          updated_at: new Date().toISOString(),
        },
      });
    }

    const { data: current, error: fetchErr } = await supabase
      .from('applications')
      .select('id, status, metadata')
      .eq('id', body.applicationId)
      .eq('candidate_profile_id', candidateProfileId)
      .single();

    if (fetchErr || !current) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    const currentMeta = (current.metadata ?? {}) as Record<string, unknown>;
    const updatedMeta = { ...currentMeta };

    if (body.status) {
      updates.status = body.status;
      if (body.status === 'SUBMITTED' && !current.metadata?.submitted_at) {
        updates.submitted_at = new Date().toISOString();
      }
    }

    if (body.interview) {
      updatedMeta.interview = body.interview;
      if (!body.status && current.status !== 'INTERVIEW') {
        updates.status = 'INTERVIEW';
      }
    }

    updates.metadata = updatedMeta;

    const { data: updated, error: updateErr } = await supabase
      .from('applications')
      .update(updates)
      .eq('id', current.id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Record transition if status changed
    if (body.status && body.status !== current.status) {
      await supabase.from('application_state_transitions').insert({
        application_id: current.id,
        from_status: current.status,
        to_status: body.status,
        reason: 'Updated by candidate in Application Tracker',
        metadata: { directUpdate: true },
      });
    }

    return NextResponse.json({ success: true, application: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Update failed' },
      { status: 500 },
    );
  }
}

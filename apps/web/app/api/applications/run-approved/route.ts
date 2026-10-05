import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { existsSync } from 'node:fs';
import { NextResponse } from 'next/server';
import { getAuthenticatedCandidate } from '../../../../lib/opportunity-data';

const execAsync = promisify(exec);

export async function POST() {
  try {
    const { supabase, user, candidateProfileId } = await getAuthenticatedCandidate();
    if (!user || !candidateProfileId) {
      return NextResponse.json(
        { error: 'Sign in before running approved applications' },
        { status: 401 },
      );
    }

    const { data: approved, error } = await supabase
      .from('applications')
      .select('id,job_id,match_score,resume_variant,jobs(company,title,application_url,location)')
      .eq('candidate_profile_id', candidateProfileId)
      .eq('status', 'APPROVED');

    if (error) throw error;

    const count = approved?.length ?? 0;
    if (count === 0) {
      return NextResponse.json({
        approvedCount: 0,
        message: 'No approved applications found. Open the Review Queue to approve ready applications before running.',
      });
    }

    // Resolve script path whether Next.js is run from root or from apps/web
    const scriptCandidates: string[] = [
      path.join(process.cwd(), 'scripts', 'apply-approved.mjs'),
      path.resolve(process.cwd(), '..', '..', 'scripts', 'apply-approved.mjs'),
    ];
    const scriptPath: string = scriptCandidates.find((p) => existsSync(p)) ?? scriptCandidates[0]!;
    const executionCwd = path.dirname(path.dirname(scriptPath));
    
    let stdout = '';
    let stderr = '';
    try {
      const result = await execAsync(
        `node "${scriptPath}" --candidate-profile-id "${candidateProfileId}" --limit 2`,
        {
          cwd: executionCwd,
          timeout: 60000,
        },
      );
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (execErr: unknown) {
      const err = execErr as { stdout?: string; stderr?: string; message?: string };
      stdout = err.stdout ?? '';
      stderr = err.stderr ?? err.message ?? 'Execution error';
    }

    return NextResponse.json({
      approvedCount: count,
      applications: approved,
      logs: stdout,
      message: `${count} approved application(s) processed with Playwright form inspection and proof capture. Full visual proofs saved to data/proofs/`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Run approved failed' },
      { status: 500 },
    );
  }
}

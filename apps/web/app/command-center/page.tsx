'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type ActionKind =
  | 'scan'
  | 'analyze'
  | 'generate'
  | 'link'
  | 'run-approved'
  | 'sync';

type Action =
  | { step: string; title: string; description: string; kind: 'scan'; buttonText: string }
  | { step: string; title: string; description: string; kind: 'analyze'; buttonText: string }
  | { step: string; title: string; description: string; kind: 'generate'; buttonText: string }
  | { step: string; title: string; description: string; kind: 'link'; href: string; buttonText: string }
  | { step: string; title: string; description: string; kind: 'run-approved'; buttonText: string }
  | { step: string; title: string; description: string; kind: 'sync'; buttonText: string };

type SourceHealth = {
  company: string;
  source: string;
  status: string;
  jobs_found: number;
  error: string | null;
};

type PipelineStats = {
  totalJobs: number;
  readyForReview: number;
  approved: number;
  skipped: number;
  submitted: number;
  sourcesConfigured: number;
};

const actions: Action[] = [
  {
    step: '01',
    title: 'Discover jobs',
    description: 'Scan configured Greenhouse, Lever, and public career pages for newly posted opportunities.',
    kind: 'scan',
    buttonText: 'Run discovery',
  },
  {
    step: '02',
    title: 'Evaluate candidate fit',
    description: 'Normalize roles, verify graduation and work authorization eligibility, and calculate match scores.',
    kind: 'analyze',
    buttonText: 'Evaluate roles',
  },
  {
    step: '03',
    title: 'Prepare application drafts',
    description: 'Select tailored resume variants and draft grounded cover letters for high-match opportunities.',
    kind: 'generate',
    buttonText: 'Prepare drafts',
  },
  {
    step: '04',
    title: 'Human review queue',
    description: 'Inspect tailored materials, answer screening questions, and approve or skip applications.',
    kind: 'link',
    href: '/review',
    buttonText: 'Open review queue',
  },
  {
    step: '05',
    title: 'Submission readiness check',
    description: 'Inspect approved applications and verify automated form submission safety before dispatch.',
    kind: 'run-approved',
    buttonText: 'Verify approved',
  },
  {
    step: '06',
    title: 'Synchronize pipeline',
    description: 'Refresh application tracking outcomes, assessment requests, and external ATS states.',
    kind: 'sync',
    buttonText: 'Sync pipeline',
  },
];

export default function CommandCenter() {
  const [status, setStatus] = useState('');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [health, setHealth] = useState<SourceHealth[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [stats, setStats] = useState<PipelineStats | null>(null);

  useEffect(() => {
    loadPipelineStatus();
  }, []);

  async function loadPipelineStatus() {
    try {
      const response = await fetch('/api/command-center/status');
      if (!response.ok) return;
      const data = (await response.json()) as {
        authenticated: boolean;
        user: { email: string } | null;
        stats: PipelineStats;
      };
      if (data.authenticated && data.user) {
        setUserEmail(data.user.email);
        setNeedsLogin(false);
      } else {
        setUserEmail(null);
      }
      if (data.stats) {
        setStats(data.stats);
      }
    } catch {
      // Fall back silently on load
    }
  }

  async function quickLogin() {
    setStatus('Signing in with candidate session…');
    setNeedsLogin(false);
    try {
      const response = await fetch('/api/auth/quick-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail || 'candidate@volunjobs.com' }),
      });
      const data = (await response.json()) as {
        success?: boolean;
        user?: { email: string };
        error?: string;
      };
      if (!response.ok || !data.success) {
        throw new Error(data.error ?? 'Quick sign in failed');
      }
      setUserEmail(data.user?.email ?? 'candidate@volunjobs.com');
      setStatus('Successfully signed in as ' + (data.user?.email ?? 'candidate') + '. You can now run all operations.');
      await loadPipelineStatus();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Sign in failed');
      setNeedsLogin(true);
    }
  }

  async function handleSignOut() {
    try {
      await fetch('/api/auth/session', { method: 'DELETE' });
      setUserEmail(null);
      setStatus('Signed out. Sign in to run operations.');
      setNeedsLogin(true);
      await loadPipelineStatus();
    } catch {
      setStatus('Sign out failed');
    }
  }

  async function scanJobs() {
    setBusyAction('scan');
    setStatus('Scanning configured public job sources…');
    setNeedsLogin(false);
    setErrors([]);
    try {
      const response = await fetch('/api/scan', { method: 'POST' });
      const body = await response.text();
      let result: {
        error?: string;
        jobsDiscovered?: number;
        jobsInserted?: number;
        reviewReady?: number;
        health?: SourceHealth[];
        errors?: Array<{ company: string; message: string }>;
        stage?: string;
      } = {};
      try {
        result = JSON.parse(body) as typeof result;
      } catch {
        result.error = `Server returned HTTP ${response.status}`;
      }
      if (!response.ok) {
        const isAuth = response.status === 401;
        setNeedsLogin(isAuth);
        setStatus(
          `${result.error ?? 'Scan failed'}${result.stage ? ` (stage: ${result.stage})` : ''}`,
        );
        return;
      }
      setHealth(result.health ?? []);
      setErrors(
        (result.errors ?? []).map((item) => `${item.company}: ${item.message}`),
      );
      setStatus(
        `Scan complete: ${result.jobsDiscovered ?? 0} jobs discovered, ${result.jobsInserted ?? 0} persisted & scored, ${result.reviewReady ?? 0} ready for review${result.errors?.length ? `, ${result.errors.length} items need attention` : ''}.`,
      );
      await loadPipelineStatus();
    } catch {
      setStatus('Scan could not reach the server. Check the dev server logs.');
    } finally {
      setBusyAction(null);
    }
  }

  async function analyzeJobs() {
    setBusyAction('analyze');
    setStatus('Analyzing and scoring newly discovered jobs…');
    setNeedsLogin(false);
    setErrors([]);
    try {
      const response = await fetch('/api/analyze', { method: 'POST' });
      const result = (await response.json()) as {
        success?: boolean;
        message?: string;
        error?: string;
      };
      if (response.status === 401) {
        setNeedsLogin(true);
        setStatus(result.error ?? 'Sign in before analyzing jobs');
        return;
      }
      if (!response.ok) throw new Error(result.error ?? 'Analysis failed');
      setStatus(result.message ?? 'Analysis complete.');
      await loadPipelineStatus();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Analysis failed');
    } finally {
      setBusyAction(null);
    }
  }

  async function generateApplications() {
    setBusyAction('generate');
    setStatus('Generating materials for the review queue…');
    setNeedsLogin(false);
    setErrors([]);
    try {
      const response = await fetch('/api/applications/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const result = (await response.json()) as {
        generated?: number;
        error?: string;
      };
      if (response.status === 401) {
        setNeedsLogin(true);
        setStatus(result.error ?? 'Sign in before generating application materials');
        return;
      }
      if (!response.ok) throw new Error(result.error ?? 'Generation failed');
      setStatus(
        `Application materials generated for ${result.generated ?? 0} review items.`,
      );
      await loadPipelineStatus();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Generation failed');
    } finally {
      setBusyAction(null);
    }
  }

  async function runApprovedApplications() {
    setBusyAction('run-approved');
    setStatus('Checking approved applications…');
    setNeedsLogin(false);
    setErrors([]);
    try {
      const response = await fetch('/api/applications/run-approved', { method: 'POST' });
      const result = (await response.json()) as {
        approvedCount?: number;
        message?: string;
        error?: string;
      };
      if (response.status === 401) {
        setNeedsLogin(true);
        setStatus(result.error ?? 'Sign in before running approved applications');
        return;
      }
      if (!response.ok) throw new Error(result.error ?? 'Action failed');
      setStatus(result.message ?? 'Checked approved applications.');
      await loadPipelineStatus();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Action failed');
    } finally {
      setBusyAction(null);
    }
  }

  async function syncStatus() {
    setBusyAction('sync');
    setStatus('Syncing application status and refreshing pipeline stats…');
    setNeedsLogin(false);
    try {
      const response = await fetch('/api/command-center/status');
      const data = (await response.json()) as {
        authenticated: boolean;
        stats?: PipelineStats;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? 'Status sync failed');
      if (data.stats) {
        setStats(data.stats);
        setStatus(
          `Status sync complete: ${data.stats.totalJobs} discovered jobs, ${data.stats.readyForReview} ready for review, ${data.stats.approved} approved, ${data.stats.submitted} submitted across ${data.stats.sourcesConfigured} sources.`,
        );
      } else {
        setStatus('Status sync completed.');
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Status sync failed');
    } finally {
      setBusyAction(null);
    }
  }

  function handleAction(action: Action) {
    if (action.kind === 'scan') {
      scanJobs();
    } else if (action.kind === 'analyze') {
      analyzeJobs();
    } else if (action.kind === 'generate') {
      generateApplications();
    } else if (action.kind === 'run-approved') {
      runApprovedApplications();
    } else if (action.kind === 'sync') {
      syncStatus();
    }
  }

  return (
    <main className="profile-page" style={{ maxWidth: '1040px', margin: '0 auto', padding: '36px 32px 72px' }}>
      {/* Top navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '18px', alignItems: 'center' }}>
          <Link className="back" href="/" style={{ margin: 0 }}>
            ← Overview
          </Link>
          <Link href="/review" style={{ fontSize: '13px', color: 'var(--muted)' }}>
            Review queue
          </Link>
          <Link href="/applications" style={{ fontSize: '13px', color: 'var(--muted)' }}>
            Applications
          </Link>
          <Link href="/profile" style={{ fontSize: '13px', color: 'var(--muted)' }}>
            Profile
          </Link>
          <Link href="/settings" style={{ fontSize: '13px', color: 'var(--muted)' }}>
            Settings
          </Link>
        </div>

        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
          {userEmail ? (
            <span>
              Signed in as <strong style={{ color: 'var(--ink)' }}>{userEmail}</strong> ·{' '}
              <button
                onClick={handleSignOut}
                type="button"
                style={{ background: 'none', border: 'none', padding: 0, color: 'var(--muted)', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Sign out
              </button>
            </span>
          ) : (
            <Link href="/login" style={{ color: 'var(--ink)', textDecoration: 'underline' }}>
              Sign in to run private operations →
            </Link>
          )}
        </div>
      </div>

      {/* Page Header */}
      <div className="desk-briefing" style={{ paddingBottom: '20px', marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)', margin: '0 0 6px' }}>
          Operations console
        </h1>
        <p className="desk-lead" style={{ margin: 0 }}>
          Execute pipeline operations deliberately. Each operation maintains strict factual accuracy and requires your explicit approval before application submission.
        </p>

        {/* Pipeline Summary Line */}
        {stats && (
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
                Discovered jobs
              </span>
              <strong style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink)' }}>
                {stats.totalJobs.toLocaleString()}
              </strong>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
                Ready for review
              </span>
              <strong style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink)' }}>
                {stats.readyForReview.toLocaleString()}
              </strong>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
                Approved
              </span>
              <strong style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink)' }}>
                {stats.approved.toLocaleString()}
              </strong>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
                Active sources
              </span>
              <strong style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink)' }}>
                {stats.sourcesConfigured}
              </strong>
            </div>
          </div>
        )}
      </div>

      {/* Operations List */}
      <div style={{ borderTop: '1px solid var(--line)' }}>
        {actions.map((action) => (
          <div
            key={action.title}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '24px',
              padding: '18px 0',
              borderBottom: '1px solid var(--line)',
            }}
          >
            <div style={{ display: 'flex', gap: '20px', alignItems: 'baseline', flex: 1 }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums', width: '24px' }}>
                {action.step}
              </span>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 3px' }}>
                  {action.title}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, lineHeight: 1.45 }}>
                  {action.description}
                </p>
              </div>
            </div>

            <div style={{ flexShrink: 0 }}>
              {action.kind === 'link' ? (
                <Link href={action.href} className="secondary-button">
                  {action.buttonText} <span>→</span>
                </Link>
              ) : (
                <button
                  type="button"
                  disabled={Boolean(busyAction)}
                  onClick={() => handleAction(action)}
                  className="secondary-button"
                >
                  {busyAction === action.kind ? 'Processing…' : action.buttonText} <span>→</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Operation Feedback Message */}
      {status && (
        <div
          role="status"
          style={{
            marginTop: '28px',
            padding: '14px 18px',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--surface-hover)',
            fontSize: '13px',
            color: 'var(--ink)',
            lineHeight: 1.5,
          }}
        >
          {status}
          {needsLogin && (
            <div style={{ marginTop: '8px', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button
                onClick={quickLogin}
                type="button"
                className="primary-button"
                style={{ fontSize: '12px', padding: '5px 12px' }}
              >
                Sign in with candidate session
              </button>
              <Link href="/login" style={{ fontSize: '12px', color: 'var(--ink)', textDecoration: 'underline' }}>
                Email sign in →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Source Health Table */}
      {health.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 12px' }}>
            Job source health ({health.filter((s) => s.status === 'HEALTHY').length} of {health.length} healthy)
          </h2>
          <div style={{ borderTop: '1px solid var(--line)' }}>
            {health.map((source) => (
              <div
                key={`${source.source}-${source.company}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: '1px solid var(--line)',
                  fontSize: '13px',
                }}
              >
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: source.status === 'HEALTHY' ? '#16a34a' : '#dc2626',
                    }}
                  />
                  <span style={{ fontWeight: 500, color: 'var(--ink)' }}>{source.company}</span>
                  <span style={{ color: 'var(--muted)', fontSize: '12px' }}>({source.source})</span>
                </div>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center', color: 'var(--muted)', fontSize: '12px' }}>
                  <span>{source.jobs_found} jobs found</span>
                  {source.error && <span style={{ color: '#dc2626' }}>{source.error}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Items Needing Attention */}
      {errors.length > 0 && (
        <div style={{ marginTop: '36px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 10px' }}>
            Items needing attention
          </h2>
          <div style={{ borderTop: '1px solid var(--line)' }}>
            {errors.slice(0, 15).map((error) => (
              <p key={error} style={{ fontSize: '13px', color: 'var(--muted)', padding: '8px 0', borderBottom: '1px solid var(--line)', margin: 0 }}>
                {error}
              </p>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

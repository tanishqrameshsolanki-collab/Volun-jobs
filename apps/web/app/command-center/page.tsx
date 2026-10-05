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
  | { title: string; description: string; kind: 'scan' }
  | { title: string; description: string; kind: 'analyze' }
  | { title: string; description: string; kind: 'generate' }
  | { title: string; description: string; kind: 'link'; href: string }
  | { title: string; description: string; kind: 'run-approved' }
  | { title: string; description: string; kind: 'sync' };

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
    title: 'SCAN JOBS',
    description: 'Discover configured public sources and collect opportunities.',
    kind: 'scan',
  },
  {
    title: 'ANALYZE NEW JOBS',
    description: 'Normalize, check eligibility, and score unscored roles.',
    kind: 'analyze',
  },
  {
    title: 'GENERATE APPLICATIONS',
    description: 'Prepare tailored resume variants and cover letter drafts.',
    kind: 'generate',
  },
  {
    title: 'REVIEW APPLICATIONS',
    description: 'Open the human approval queue and make decisions.',
    kind: 'link',
    href: '/review',
  },
  {
    title: 'RUN APPROVED APPLICATIONS',
    description: 'Prepare and inspect permitted automated form submissions.',
    kind: 'run-approved',
  },
  {
    title: 'SYNC APPLICATION STATUS',
    description: 'Refresh tracked pipeline outcomes and application states.',
    kind: 'sync',
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
    <main className="command">
      <div className="command-top-bar">
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Link className="back" href="/">
            ← Dashboard
          </Link>
          <Link href="/review" style={{ fontSize: '13px', color: 'var(--muted)' }}>
            Review Queue
          </Link>
          <Link href="/profile" style={{ fontSize: '13px', color: 'var(--muted)' }}>
            Profile
          </Link>
          <Link href="/settings" style={{ fontSize: '13px', color: 'var(--muted)' }}>
            Settings
          </Link>
          <Link href="/analytics" style={{ fontSize: '13px', color: 'var(--muted)' }}>
            Analytics
          </Link>
        </div>
        <div className="auth-badge">
          {userEmail ? (
            <>
              <span>Signed in as <strong>{userEmail}</strong></span>
              <button onClick={handleSignOut} type="button">
                Sign out
              </button>
            </>
          ) : (
            <>
              <span>Sign in to run private operations</span>
              <Link
                href="/login"
                className="primary-button"
                style={{ padding: '5px 12px', fontSize: '11px' }}
              >
                Sign In
              </Link>
            </>
          )}
        </div>
      </div>

      <p className="eyebrow accent">Operations</p>
      <h1>Command center</h1>
      <p className="lead">
        Run the pipeline deliberately. Every action will show progress and
        preserve a review gate before submission.
      </p>

      {stats && (
        <div className="command-stats-strip" aria-label="Pipeline overview">
          <div className="command-stat-item">
            <span>Discovered Jobs</span>
            <strong>{stats.totalJobs.toLocaleString()}</strong>
          </div>
          <div className="command-stat-item">
            <span>Ready for Review</span>
            <strong>{stats.readyForReview.toLocaleString()}</strong>
          </div>
          <div className="command-stat-item">
            <span>Approved</span>
            <strong>{stats.approved.toLocaleString()}</strong>
          </div>
          <div className="command-stat-item">
            <span>Job Sources</span>
            <strong>{stats.sourcesConfigured} Active</strong>
          </div>
        </div>
      )}

      <div className="command-grid">
        {actions.map((action) =>
          action.kind === 'link' ? (
            <Link
              className="command-card"
              href={action.href}
              key={action.title}
            >
              <span>{action.title}</span>
              <small>{action.description}</small>
              <b>→</b>
            </Link>
          ) : (
            <button
              className="command-card"
              disabled={Boolean(busyAction)}
              key={action.title}
              onClick={() => handleAction(action)}
              type="button"
            >
              <span>
                {busyAction === action.kind
                  ? 'PROCESSING…'
                  : action.title}
              </span>
              <small>{action.description}</small>
              <b>→</b>
            </button>
          ),
        )}
      </div>

      {status && (
        <p className="command-status" role="status">
          {status}
          {needsLogin && (
            <>
              {' '}
              <button
                className="quick-login-btn"
                onClick={quickLogin}
                style={{ marginLeft: 8 }}
                type="button"
              >
                1-Click Sign In →
              </button>{' '}
              <Link href="/login">Email link →</Link>
            </>
          )}
        </p>
      )}

      {health.length > 0 && (
        <div className="source-health" aria-label="Job source health">
          <h2>Source health ({health.filter((s) => s.status === 'HEALTHY').length}/{health.length} Healthy)</h2>
          {health.map((source) => (
            <div
              className="source-health-row"
              key={`${source.source}-${source.company}`}
            >
              <span>{source.company} ({source.source})</span>
              <strong>{source.status}</strong>
              <small>{source.jobs_found} jobs found</small>
              {source.error && <small>{source.error}</small>}
            </div>
          ))}
        </div>
      )}

      {errors.length > 0 && (
        <div className="source-health" aria-label="Scan errors">
          <h2>Items needing attention</h2>
          {errors.slice(0, 20).map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      )}
    </main>
  );
}

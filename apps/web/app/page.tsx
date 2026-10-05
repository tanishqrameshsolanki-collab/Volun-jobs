import Link from 'next/link';
import type { DashboardOpportunity } from '@tanishq/shared';
import { loadDashboardSummary } from '../lib/dashboard-data';
import { getAuthenticatedCandidate } from '../lib/opportunity-data';
import { UserNav } from '../components/user-nav';
import { MobileNav } from '../components/mobile-nav';

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function OpportunityCard({
  opportunity,
}: {
  opportunity: DashboardOpportunity;
}) {
  return (
    <article className="opportunity-card">
      <div className="opportunity-top">
        <div>
          <p className="company-name">{opportunity.company}</p>
          <h3>{opportunity.title}</h3>
        </div>
        <strong className="score">
          <span>●</span>
          {opportunity.matchScore}%
          <small>MATCH</small>
        </strong>
      </div>
      <div className="opportunity-meta">
        <span>{opportunity.location ?? 'Location not stated'}</span>
        <span
          className={`eligibility ${opportunity.eligibility.toLowerCase()}`}
        >
          {opportunity.eligibility.replaceAll('_', ' ')}
        </span>
      </div>
      <div className="opportunity-reasons">
        {opportunity.whyItMatches.slice(0, 3).map((reason) => (
          <span key={reason}>
            <span style={{ color: 'var(--match-emerald)', fontSize: '10px', marginTop: '2px' }}>●</span>
            {reason}
          </span>
        ))}
      </div>
      {opportunity.missingRequirements.length > 0 && (
        <p className="missing">
          <b>Missing:</b> {opportunity.missingRequirements.join(', ')}
        </p>
      )}
      <div className="opportunity-footer">
        <span>
          {opportunity.recommendedResume
            .replace('resume_', '')
            .replace('_', ' ')}{' '}
          resume
        </span>
        <Link className="review-link" href={`/opportunities/${opportunity.id}`}>
          Inspect Details <span>→</span>
        </Link>
      </div>
    </article>
  );
}

export default async function Dashboard() {
  const summary = await loadDashboardSummary();
  const { supabase, user, candidateProfileId } =
    await getAuthenticatedCandidate();

  let candidateName = '';
  const email = user?.email ?? '';

  if (user && candidateProfileId) {
    const { data: profileRow } = await supabase
      .from('candidate_profiles')
      .select('full_name')
      .eq('id', candidateProfileId)
      .maybeSingle();
    if (profileRow?.full_name) {
      candidateName = profileRow.full_name;
    }
  }

  const isAuthenticated = Boolean(user);
  const firstName = candidateName ? candidateName.split(' ')[0] : 'there';
  const initials = candidateName
    ? candidateName
      .split(' ')
      .map((s) => s[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
    : (email ? email.slice(0, 2).toUpperCase() : 'CA');

  return (
    <div className="page-wrapper">
      <MobileNav />
      <main className="shell">
        <aside className="sidebar">
          <div className="brand">
            <span className="brand-mark">V</span>
            <span>
              <b>Volun jobs</b>
            </span>
          </div>
          <nav>
            <Link className="active" href="/">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
              Overview
            </Link>
            <Link href="/jobs">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
              Jobs
            </Link>
            <Link href="/applications">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
              Applications
            </Link>
            <Link href="/interviews">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              Interviews
            </Link>
            <Link href="/review">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
              Review Queue
            </Link>
            <Link href="/analytics">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
              Analytics
            </Link>
          </nav>
          <div className="sidebar-bottom">
            <Link href="/command-center">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
              Command Center
            </Link>
            <Link href="/profile">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              Candidate Profile
            </Link>
            <Link href="/settings">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              Settings
            </Link>
          </div>
        </aside>

        <section className="content" id="overview">
          <header className="topbar">
            <div>
              <p className="eyebrow">Workspace Overview</p>
              <h1>
                {isAuthenticated
                  ? `Good morning, ${firstName}.`
                  : 'Welcome to Volun jobs.'}
              </h1>
            </div>
            {isAuthenticated ? (
              <UserNav
                fullName={candidateName || 'Candidate'}
                initials={initials}
                email={email}
              />
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <Link href="/login" className="secondary-button" style={{ padding: '8px 14px', fontSize: '13px' }}>
                  Sign In
                </Link>
                <Link href="/onboarding" className="primary-button" style={{ padding: '8px 14px', fontSize: '13px' }}>
                  Get Started →
                </Link>
              </div>
            )}
          </header>

          <div className="hero">
            <div>
              <p className="eyebrow">Operational Intelligence</p>
              <h2>Autonomous Job Search Engine</h2>
              <p className="hero-copy">
                Scan public ATS endpoints, evaluate candidate match qualifications, and govern every application step through strict human approval.
              </p>
            </div>
            <Link className="primary-button" href="/command-center">
              Open Command Center <span>→</span>
            </Link>
          </div>

          {/* Attention & Action Hierarchy */}
          <div className="attention-strip">
            <div className="attention-header">
              <h3>Action Items Requiring Decision</h3>
              <span className="muted">Priority items</span>
            </div>
            <div className="attention-cards">
              <Link href="/jobs" className="attention-card">
                <span className="attention-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>
                </span>
                <div>
                  <strong>{summary.highMatch} high-match roles</strong>
                  <p>Qualified with match score ≥ 80%</p>
                </div>
                <span className="attention-arrow">→</span>
              </Link>
              <Link href="/review" className="attention-card">
                <span className="attention-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                </span>
                <div>
                  <strong>{summary.ready} applications to review</strong>
                  <p>Awaiting your approval before submission</p>
                </div>
                <span className="attention-arrow">→</span>
              </Link>
              <Link href="/interviews" className="attention-card">
                <span className="attention-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                </span>
                <div>
                  <strong>{summary.interviews} interview rounds</strong>
                  <p>Prep notes and verified candidate facts</p>
                </div>
                <span className="attention-arrow">→</span>
              </Link>
            </div>
          </div>

          <div className="metrics">
            <Metric label="Jobs found" value={summary.jobsFound} />
            <Metric label="High match" value={summary.highMatch} />
            <Metric label="Ready" value={summary.ready} />
            <Metric label="Applied" value={summary.applied} />
            <Metric label="OA" value={summary.oa} />
            <Metric label="Interviews" value={summary.interviews} />
            <Metric label="Offers" value={summary.offers} />
          </div>

          <div className="section-heading" id="recommended">
            <div>
              <p className="eyebrow">Your pipeline</p>
              <h2>Recommended Opportunities</h2>
            </div>
            <Link href="/jobs" className="muted" style={{ textDecoration: 'underline' }}>
              View all ({summary.jobsFound}) →
            </Link>
          </div>

          {summary.recommended.length > 0 ? (
            <div className="opportunity-grid">
              {summary.recommended.map((opportunity) => (
                <OpportunityCard key={opportunity.id} opportunity={opportunity} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-icon" style={{ background: 'var(--line-subtle)', borderRadius: '8px', width: '40px', height: '40px', margin: '0 auto 12px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              </span>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>Your opportunity queue is clear</h3>
              <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '4px auto 16px', maxWidth: '440px' }}>
                Run a scan from the command center to discover live roles from configured ATS endpoints.
              </p>
              <Link className="primary-button" href="/command-center">
                Scan for jobs <span>→</span>
              </Link>
            </div>
          )}

          <div className="section-heading review-heading" id="applications">
            <div>
              <p className="eyebrow">Decision queue</p>
              <h2>Needs Review</h2>
            </div>
            <Link href="/review" className="muted" style={{ textDecoration: 'underline' }}>
              Open review queue →
            </Link>
          </div>

          {summary.needsReview.length > 0 ? (
            <div className="opportunity-grid">
              {summary.needsReview.map((opportunity) => (
                <OpportunityCard key={opportunity.id} opportunity={opportunity} />
              ))}
            </div>
          ) : (
            <div className="quiet-state">
              No opportunities need review right now.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

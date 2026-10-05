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
          <span key={reason}>✓ {reason}</span>
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
          Review <span>→</span>
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
              Overview
            </Link>
            <Link href="/jobs">Jobs</Link>
            <Link href="/applications">Applications</Link>
            <Link href="/interviews">Interviews</Link>
            <Link href="/review">Review Queue</Link>
            <Link href="/analytics">Analytics</Link>
          </nav>
          <div className="sidebar-bottom">
            <Link href="/command-center">Command Center</Link>
            <Link href="/profile">Candidate Profile</Link>
            <Link href="/settings">Settings</Link>
          </div>
        </aside>

        <section className="content" id="overview">
          <header className="topbar">
            <div>
              <p className="eyebrow">Today</p>
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
              <p className="eyebrow accent">Opportunity intelligence</p>
              <h2>Find work worth applying to.</h2>
              <p className="hero-copy">
                Scan public ATS endpoints, evaluate match qualifications, and keep every application step under your explicit review.
              </p>
            </div>
            <Link className="primary-button" href="/command-center">
              Open command center <span>→</span>
            </Link>
          </div>

          {/* Attention & Action Hierarchy */}
          <div className="attention-strip">
            <div className="attention-header">
              <h3>Action Items Today</h3>
              <span className="muted">Priority items needing your decision</span>
            </div>
            <div className="attention-cards">
              <Link href="/jobs" className="attention-card">
                <span className="attention-icon">★</span>
                <div>
                  <strong>{summary.highMatch} high-match roles</strong>
                  <p>Qualified with match score ≥ 80%</p>
                </div>
                <span className="attention-arrow">→</span>
              </Link>
              <Link href="/review" className="attention-card">
                <span className="attention-icon">⚖️</span>
                <div>
                  <strong>{summary.ready} applications to review</strong>
                  <p>Awaiting your approval before submission</p>
                </div>
                <span className="attention-arrow">→</span>
              </Link>
              <Link href="/interviews" className="attention-card">
                <span className="attention-icon">📅</span>
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
              <span className="empty-icon">📁</span>
              <h3>Your opportunity queue is clear.</h3>
              <p>
                Run a scan from the command center to discover public roles. New
                jobs will be normalized, checked for eligibility, and scored here.
              </p>
              <Link className="secondary-button" href="/command-center">
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

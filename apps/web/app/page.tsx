import Link from 'next/link';
import type { DashboardOpportunity } from '@tanishq/shared';
import { loadDashboardSummary } from '../lib/dashboard-data';
import { getAuthenticatedCandidate } from '../lib/opportunity-data';
import { UserNav } from '../components/user-nav';
import { MobileNav } from '../components/mobile-nav';

function OpportunityDeskRow({ opportunity }: { opportunity: DashboardOpportunity }) {
  return (
    <article className="desk-row">
      <div className="desk-row-main">
        <div className="desk-row-top">
          <span className="desk-company">{opportunity.company}</span>
          <span className="desk-location">· {opportunity.location ?? 'Remote'}</span>
        </div>
        <h3 className="desk-title">{opportunity.title}</h3>
        <p className="desk-fit">
          {opportunity.whyItMatches.length > 0
            ? opportunity.whyItMatches.slice(0, 2).join(' · ')
            : 'Strong alignment with your profile experience.'}
        </p>
      </div>
      <div className="desk-row-meta">
        <span className="desk-match-score">{opportunity.matchScore}% match</span>
        <Link className="desk-text-link" href={`/opportunities/${opportunity.id}`}>
          Review role →
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

  const actionItemsCount = summary.highMatch + summary.ready + summary.interviews;

  return (
    <div className="page-wrapper">
      <MobileNav />
      <main className="shell">
        <aside className="sidebar">
          <div className="brand">
            <span className="brand-mark">V</span>
            <span>
              <b>Volun</b>
            </span>
          </div>
          <nav>
            <Link className="active" href="/">
              Overview
            </Link>
            <Link href="/jobs">
              Jobs
            </Link>
            <Link href="/applications">
              Applications
            </Link>
            <Link href="/interviews">
              Interviews
            </Link>
            <Link href="/review">
              Review Queue
            </Link>
            <Link href="/analytics">
              Analytics
            </Link>
          </nav>
          <div className="sidebar-bottom">
            <Link href="/command-center">
              Command Center
            </Link>
            <Link href="/profile">
              Candidate Profile
            </Link>
            <Link href="/settings">
              Settings
            </Link>
          </div>
        </aside>

        <section className="content" id="overview">
          <header className="topbar">
            <div>
              <p className="eyebrow">Workspace</p>
              <h1>
                {isAuthenticated
                  ? `Good morning, ${firstName}.`
                  : 'Welcome to Volun.'}
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
                <Link href="/login" className="secondary-button" style={{ padding: '7px 12px', fontSize: '13px' }}>
                  Sign In
                </Link>
                <Link href="/onboarding" className="primary-button" style={{ padding: '7px 12px', fontSize: '13px' }}>
                  Get Started →
                </Link>
              </div>
            )}
          </header>

          {/* Editorial Briefing: Personal Work Desk */}
          <div className="desk-briefing">
            <p className="desk-lead">
              {actionItemsCount > 0
                ? `You have ${actionItemsCount} items worth looking at today.`
                : 'Your work desk is clear. No applications currently require attention.'}
            </p>
          </div>

          {/* Action Items List */}
          <div className="desk-actions">
            {summary.highMatch > 0 && (
              <div className="desk-action-row">
                <div className="desk-action-info">
                  <span className="desk-action-title">{summary.highMatch} new strong matches</span>
                  <span className="desk-action-desc">Roles with 80%+ qualification match against your verified profile.</span>
                </div>
                <Link href="/jobs" className="desk-action-link">
                  View opportunities →
                </Link>
              </div>
            )}

            {summary.ready > 0 && (
              <div className="desk-action-row">
                <div className="desk-action-info">
                  <span className="desk-action-title">{summary.ready} applications needing your review</span>
                  <span className="desk-action-desc">Prepared with tailored resumes and cover letters; awaiting your decision.</span>
                </div>
                <Link href="/review" className="desk-action-link">
                  Open review queue →
                </Link>
              </div>
            )}

            {summary.interviews > 0 && (
              <div className="desk-action-row">
                <div className="desk-action-info">
                  <span className="desk-action-title">{summary.interviews} upcoming interview rounds</span>
                  <span className="desk-action-desc">Review your scheduled rounds, prep notes, and candidate fact sheet.</span>
                </div>
                <Link href="/interviews" className="desk-action-link">
                  View interviews →
                </Link>
              </div>
            )}
          </div>

          {/* Recommended Opportunities Section */}
          <div className="desk-section" id="recommended">
            <div className="desk-section-head">
              <h2>Recommended opportunities</h2>
              <Link href="/jobs">
                View all ({summary.jobsFound})
              </Link>
            </div>

            {summary.recommended.length > 0 ? (
              <div className="desk-editorial-list">
                {summary.recommended.slice(0, 5).map((opportunity) => (
                  <OpportunityDeskRow key={opportunity.id} opportunity={opportunity} />
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--muted)', fontSize: '14px', padding: '16px 0' }}>
                No recommended opportunities right now. Run a scan from the{' '}
                <Link href="/command-center" style={{ textDecoration: 'underline' }}>
                  command center
                </Link>{' '}
                to discover new roles.
              </p>
            )}
          </div>

          {/* Applications Needing Review Section */}
          <div className="desk-section" id="review">
            <div className="desk-section-head">
              <h2>Applications needing attention</h2>
              <Link href="/review">
                Open queue ({summary.ready})
              </Link>
            </div>

            {summary.needsReview.length > 0 ? (
              <div className="desk-editorial-list">
                {summary.needsReview.map((opportunity) => (
                  <OpportunityDeskRow key={opportunity.id} opportunity={opportunity} />
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--muted)', fontSize: '14px', padding: '16px 0' }}>
                All applications are up to date. Nothing is currently waiting on your decision.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

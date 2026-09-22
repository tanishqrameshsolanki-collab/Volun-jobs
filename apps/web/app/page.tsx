import Link from 'next/link';
import type { DashboardOpportunity } from '@tanishq/shared';
import { loadDashboardSummary } from '../lib/dashboard-data';

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
          {opportunity.matchScore}
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

import { getAuthenticatedCandidate } from '../lib/opportunity-data';
import { UserNav } from '../components/user-nav';

export default async function Dashboard() {
  const summary = await loadDashboardSummary();
  const { supabase, user, candidateProfileId } =
    await getAuthenticatedCandidate();

  let candidateName = 'Tanishq Solanki';
  let email = user?.email ?? '';

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

  const firstName = candidateName.split(' ')[0] || 'there';
  const initials = candidateName
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">V</span>
          <span>
            <b>Volun jobs</b>
          </span>
        </div>
        <nav>
          <a className="active" href="#overview">
            Overview
          </a>
          <a href="#recommended">Recommended</a>
          <a href="#applications">Applications</a>
          <Link href="/analytics">Analytics</Link>
        </nav>
        <div className="sidebar-bottom">
          <Link href="/command-center">Command center</Link>
          <Link href="/review">Review queue</Link>
          <Link href="/profile">Profile</Link>
          <Link href="/settings">Settings</Link>
        </div>
      </aside>
      <section className="content" id="overview">
        <header className="topbar">
          <div>
            <p className="eyebrow">Today</p>
            <h1>Good morning, {firstName}.</h1>
          </div>
          <UserNav
            fullName={candidateName}
            initials={initials}
            email={email}
          />
        </header>
        <div className="hero">
          <div>
            <p className="eyebrow accent">Opportunity intelligence</p>
            <h2>Find work worth applying to.</h2>
            <p className="hero-copy">
              Scan public sources, evaluate fit, and keep every application
              under your control.
            </p>
          </div>
          <Link className="primary-button" href="/command-center">
            Open command center <span>→</span>
          </Link>
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
            <h2>Recommended</h2>
          </div>
          <span className="muted">Top opportunities by match score</span>
        </div>
        {summary.recommended.length > 0 ? (
          <div className="opportunity-grid">
            {summary.recommended.map((opportunity) => (
              <OpportunityCard key={opportunity.id} opportunity={opportunity} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-icon">✦</span>
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
            <h2>Needs review</h2>
          </div>
          <span className="muted">Eligibility or approval needed</span>
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
  );
}

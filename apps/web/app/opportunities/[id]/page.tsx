import Link from 'next/link';
import { notFound } from 'next/navigation';
import { readFile } from 'node:fs/promises';
import { opportunitiesPath } from '../../../lib/dashboard-data';
import type { DashboardOpportunity } from '@tanishq/shared';
import { loadPersistedOpportunity } from '../../../lib/opportunity-data';

export default async function OpportunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const persisted = await loadPersistedOpportunity(id);
  const local = JSON.parse(
    await readFile(opportunitiesPath, 'utf8'),
  ) as DashboardOpportunity[];
  const opportunity = persisted ?? local.find((item) => item.id === id);
  if (!opportunity) notFound();
  return (
    <main className="opportunity-detail">
      <Link className="back" href="/">
        ← Dashboard
      </Link>
      <div className="detail-head">
        <div>
          <p className="eyebrow accent">Opportunity review</p>
          <h1>{opportunity.title}</h1>
          <p className="lead">
            {opportunity.company} ·{' '}
            {opportunity.location ?? 'Location not stated'}
          </p>
        </div>
        <strong className="detail-score">
          {opportunity.matchScore}
          <small className="score">MATCH</small>
        </strong>
      </div>
      <div className="detail-grid">
        <section className="detail-panel">
          <h2>Why this matches</h2>
          <ul>
            {opportunity.whyItMatches.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          {opportunity.missingRequirements.length > 0 && (
            <>
              <h2 className="detail-subheading">Missing requirements</h2>
              <ul>
                {opportunity.missingRequirements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          )}
        </section>
        <aside className="detail-panel detail-warning">
          <h2>Eligibility</h2>
          <p>{opportunity.eligibility.replaceAll('_', ' ')}</p>
          <h2 className="detail-subheading">Application status</h2>
          <p>{opportunity.applicationStatus.replaceAll('_', ' ')}</p>
          <p className="detail-source">Source: {opportunity.source}</p>
        </aside>
      </div>
      <div className="detail-actions">
        <a
          className="primary-button"
          href={opportunity.applicationUrl}
          target="_blank"
          rel="noreferrer"
        >
          Open application <span>↗</span>
        </a>
        <Link className="secondary-button" href="/command-center">
          Back to command center
        </Link>
      </div>
    </main>
  );
}

'use client';

import { useState } from 'react';
import type { DashboardOpportunity } from '@tanishq/shared';

export default function ReviewQueue({
  opportunities,
}: {
  opportunities: DashboardOpportunity[];
}) {
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  if (opportunities.length === 0)
    return (
      <div className="quiet-state">
        No applications are waiting for review. Run a scan and analysis first.
      </div>
    );
  async function decide(
    applicationId: string | undefined,
    opportunityId: string,
    decision: 'APPROVE_AND_APPLY' | 'EDIT' | 'SKIP' | 'ASK_ME',
    label: string,
  ) {
    if (!applicationId) {
      setError(
        'Review actions require a signed-in Supabase application record.',
      );
      return;
    }
    setBusy(opportunityId);
    setError('');
    try {
      const response = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, decision }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Review action failed');
      setDecisions((current) => ({ ...current, [opportunityId]: label }));
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : 'Review action failed',
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="review-list" suppressHydrationWarning>
      {error && <p className="command-status">{error}</p>}
      {opportunities.map((opportunity) => (
        <article className="review-card" key={opportunity.id}>
          <div>
            <p className="company-name">{opportunity.company}</p>
            <h2>{opportunity.title}</h2>
            <p className="review-meta">
              {opportunity.matchScore} match ·{' '}
              {opportunity.eligibility.replaceAll('_', ' ')}
            </p>
          </div>
          <div className="review-actions">
            <button
              onClick={() =>
                decide(
                  opportunity.applicationId,
                  opportunity.id,
                  'APPROVE_AND_APPLY',
                  'Approved for guarded application preparation',
                )
              }
              disabled={
                busy === opportunity.id ||
                opportunity.eligibility === 'INELIGIBLE'
              }
              className="primary-button"
            >
              Approve &amp; apply
            </button>
            <button
              onClick={() =>
                decide(
                  opportunity.applicationId,
                  opportunity.id,
                  'EDIT',
                  'Needs editing',
                )
              }
              disabled={busy === opportunity.id}
              className="secondary-button"
            >
              Edit
            </button>
            <button
              onClick={() =>
                decide(
                  opportunity.applicationId,
                  opportunity.id,
                  'SKIP',
                  'Skipped',
                )
              }
              disabled={busy === opportunity.id}
              className="secondary-button"
            >
              Skip
            </button>
            <button
              onClick={() =>
                decide(
                  opportunity.applicationId,
                  opportunity.id,
                  'ASK_ME',
                  'Question flagged',
                )
              }
              disabled={busy === opportunity.id}
              className="secondary-button"
            >
              Ask me
            </button>
          </div>
          {opportunity.coverLetter && (
            <details className="materials">
              <summary>View generated cover letter</summary>
              <pre>{opportunity.coverLetter}</pre>
            </details>
          )}
          {decisions[opportunity.id] && (
            <p className="decision-note">
              {decisions[opportunity.id]}. The decision is saved to Supabase;
              submission remains blocked until the guarded application runner is
              explicitly configured.
            </p>
          )}
        </article>
      ))}
    </div>
  );
}

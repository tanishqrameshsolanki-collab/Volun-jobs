'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { DashboardOpportunity } from '@tanishq/shared';

export default function ReviewQueue({
  opportunities,
}: {
  opportunities: DashboardOpportunity[];
}) {
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (opportunities.length === 0) {
    return (
      <div className="quiet-state" style={{ padding: '48px 24px', textAlign: 'center', maxWidth: '600px', margin: '32px auto', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', boxShadow: 'var(--shadow-card)' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--match-emerald-bg)', border: '1px solid var(--match-emerald-border)', color: 'var(--match-emerald)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--ink)' }}>All Caught Up</h2>
        <p style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: 1.5, margin: '0 0 24px 0' }}>
          No applications are currently awaiting human approval. Once you scan and score new opportunities, high-matching roles will appear here with tailored cover letters and resume variants for your review.
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/jobs" className="primary-button" style={{ textDecoration: 'none' }}>
            Explore Available Jobs →
          </Link>
          <Link href="/command-center" className="secondary-button" style={{ textDecoration: 'none' }}>
            Open Command Center
          </Link>
          <Link href="/applications" className="secondary-button" style={{ textDecoration: 'none' }}>
            View Application Tracker
          </Link>
        </div>
      </div>
    );
  }

  async function decide(
    applicationId: string | undefined,
    opportunityId: string,
    decision: 'APPROVE_AND_APPLY' | 'EDIT' | 'SKIP' | 'ASK_ME',
    label: string,
  ) {
    setBusy(opportunityId);
    setError('');
    try {
      const response = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: applicationId || undefined,
          jobId: opportunityId,
          decision,
        }),
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

  function handleCopyCoverLetter(opportunityId: string, text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(opportunityId);
      setTimeout(() => setCopiedId(null), 2500);
    }).catch(() => {});
  }

  return (
    <div className="review-list" suppressHydrationWarning>
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', fontWeight: 500 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          {error}
        </div>
      )}

      {opportunities.map((opportunity) => {
        const isDecided = Boolean(decisions[opportunity.id]);
        const decisionText = decisions[opportunity.id];

        return (
          <article className="review-card" key={opportunity.id} style={{ opacity: isDecided ? 0.75 : 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <p className="company-name">{opportunity.company}</p>
                <h2 style={{ margin: '4px 0 8px 0', fontSize: '19px', fontWeight: 600 }}>{opportunity.title}</h2>
                <p className="review-meta">
                  <span style={{ fontWeight: 700, color: 'var(--match-emerald)', background: 'var(--match-emerald-bg)', border: '1px solid var(--match-emerald-border)', padding: '2px 7px', borderRadius: '4px', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace' }}>
                    {opportunity.matchScore}% Match
                  </span>
                  {' · '}
                  <span style={{ textTransform: 'capitalize' }}>
                    {opportunity.eligibility.toLowerCase().replace('_', ' ')}
                  </span>
                  {opportunity.location && ` · ${opportunity.location}`}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className="pill" style={{ fontSize: '12px', background: 'var(--wash)' }}>
                  Resume: {opportunity.recommendedResume ?? 'resume_general'}
                </span>
                {opportunity.applicationUrl && (
                  <a
                    href={opportunity.applicationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="secondary-button"
                    style={{ fontSize: '12px', padding: '6px 10px', textDecoration: 'none' }}
                  >
                    View Job Posting ↗
                  </a>
                )}
              </div>
            </div>

            {/* Why it matches & Missing Requirements */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', margin: '16px 0', padding: '14px', background: 'var(--wash)', borderRadius: '8px' }}>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, color: 'var(--muted)' }}>
                  Why you match
                </span>
                <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', fontSize: '13px', lineHeight: 1.5, color: 'var(--ink)' }}>
                  {opportunity.whyItMatches && opportunity.whyItMatches.length > 0 ? (
                    opportunity.whyItMatches.map((item, idx) => <li key={idx}>{item}</li>)
                  ) : (
                    <li>Strong technical alignment with stated stack and qualifications.</li>
                  )}
                </ul>
              </div>

              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, color: 'var(--muted)' }}>
                  Requirements &amp; Potential Gaps
                </span>
                <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', fontSize: '13px', lineHeight: 1.5, color: 'var(--muted)' }}>
                  {opportunity.missingRequirements && opportunity.missingRequirements.length > 0 ? (
                    opportunity.missingRequirements.map((item, idx) => <li key={idx}>{item}</li>)
                  ) : (
                    <li style={{ color: '#15803d' }}>No blocking gaps identified against your profile facts.</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Pre-flight assurance */}
            <div style={{ fontSize: '12px', color: 'var(--muted)', background: 'var(--surface)', border: '1px solid var(--line)', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px' }}>
              🛡️ <strong>Human Approval Gate:</strong> Approving authorizes the application runner to prepare submission materials. The runner strictly adheres to verified profile facts and halts for manual review on legal, sponsorship, or custom questions.
            </div>

            {/* Actions */}
            <div className="review-actions">
              <button
                onClick={() =>
                  decide(
                    opportunity.applicationId,
                    opportunity.id,
                    'APPROVE_AND_APPLY',
                    'Approved for guarded application submission',
                  )
                }
                disabled={
                  busy === opportunity.id ||
                  opportunity.eligibility === 'INELIGIBLE' ||
                  isDecided
                }
                className="primary-button"
              >
                {busy === opportunity.id ? 'Processing…' : 'Approve & Apply'}
              </button>

              <button
                onClick={() =>
                  decide(
                    opportunity.applicationId,
                    opportunity.id,
                    'EDIT',
                    'Marked for material edits',
                  )
                }
                disabled={busy === opportunity.id || isDecided}
                className="secondary-button"
              >
                Edit Draft
              </button>

              <button
                onClick={() =>
                  decide(
                    opportunity.applicationId,
                    opportunity.id,
                    'ASK_ME',
                    'Question flagged for manual review',
                  )
                }
                disabled={busy === opportunity.id || isDecided}
                className="secondary-button"
              >
                Ask Me / Flag
              </button>

              <button
                onClick={() =>
                  decide(
                    opportunity.applicationId,
                    opportunity.id,
                    'SKIP',
                    'Application skipped',
                  )
                }
                disabled={busy === opportunity.id || isDecided}
                className="secondary-button"
              >
                Skip
              </button>
            </div>

            {/* Generated Cover Letter */}
            {opportunity.coverLetter && (
              <details className="materials" style={{ marginTop: '16px' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 500, fontSize: '13px' }}>
                  Preview Tailored Cover Letter
                </summary>
                <div style={{ position: 'relative', marginTop: '8px' }}>
                  <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px', lineHeight: 1.6, background: 'var(--surface)', padding: '14px', borderRadius: '6px', border: '1px solid var(--line)', maxHeight: '240px', overflowY: 'auto' }}>
                    {opportunity.coverLetter}
                  </pre>
                  <button
                    type="button"
                    onClick={() => handleCopyCoverLetter(opportunity.id, opportunity.coverLetter!)}
                    className="secondary-button"
                    style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '11px', padding: '4px 8px' }}
                  >
                    {copiedId === opportunity.id ? '✓ Copied' : 'Copy Text'}
                  </button>
                </div>
              </details>
            )}

            {isDecided && (
              <p className="decision-note" style={{ marginTop: '14px', fontWeight: 500, color: 'var(--accent)' }}>
                ✓ {decisionText}. State saved to database.
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}

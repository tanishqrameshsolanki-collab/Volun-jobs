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
      <div style={{ padding: '48px 0', borderTop: '1px solid var(--line)', color: 'var(--muted)' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 6px 0' }}>All caught up</h2>
        <p style={{ fontSize: '14px', lineHeight: 1.5, margin: '0 0 20px 0' }}>
          No applications are currently awaiting human review. Once new opportunities are discovered and scored, high-matching roles will appear here with tailored materials for your approval.
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/jobs" className="secondary-button">
            View discovered jobs →
          </Link>
          <Link href="/command-center" className="secondary-button">
            Command center
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
    <div style={{ display: 'flex', flexDirection: 'column' }} suppressHydrationWarning>
      {error && (
        <div style={{ padding: '12px 14px', border: '1px solid #e0e0e0', background: '#fafafa', color: '#111111', borderRadius: 'var(--radius-sm)', marginBottom: '24px', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {opportunities.map((opportunity) => {
        const isDecided = Boolean(decisions[opportunity.id]);
        const decisionText = decisions[opportunity.id];

        return (
          <article
            key={opportunity.id}
            style={{
              padding: '28px 0',
              borderTop: '1px solid var(--line)',
              opacity: isDecided ? 0.6 : 1,
            }}
          >
            {/* Header: Company & Title */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {opportunity.company}
                </span>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink)', margin: '3px 0 4px', letterSpacing: '-0.015em' }}>
                  {opportunity.title}
                </h2>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px', color: 'var(--muted)' }}>
                  <span>{opportunity.location || 'Location not stated'}</span>
                  <span>·</span>
                  <span>{opportunity.matchScore}% qualification match</span>
                </div>
              </div>

              {opportunity.applicationUrl && (
                <a
                  href={opportunity.applicationUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '12px', color: 'var(--muted)', textDecoration: 'underline' }}
                >
                  Official posting ↗
                </a>
              )}
            </div>

            {/* Application Readiness Document Checklist */}
            <div style={{ background: 'var(--surface-hover)', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '16px 20px', margin: '16px 0' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted)', marginBottom: '12px' }}>
                Application Readiness
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: 'var(--muted)', display: 'block', fontSize: '11px' }}>Resume Variant</span>
                  <strong style={{ fontWeight: 600, color: 'var(--ink)' }}>{opportunity.recommendedResume ?? 'Master Resume'}</strong>
                </div>

                <div>
                  <span style={{ color: 'var(--muted)', display: 'block', fontSize: '11px' }}>Cover Letter</span>
                  <strong style={{ fontWeight: 600, color: 'var(--ink)' }}>
                    {opportunity.coverLetter ? 'Tailored draft ready' : 'Standard profile introduction'}
                  </strong>
                </div>

                <div>
                  <span style={{ color: 'var(--muted)', display: 'block', fontSize: '11px' }}>Screening Questions</span>
                  <strong style={{ fontWeight: 600, color: 'var(--ink)' }}>Grounded in profile facts</strong>
                </div>
              </div>

              {/* Fit & Gaps Details */}
              <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--line)', fontSize: '13px', lineHeight: 1.5 }}>
                <p style={{ margin: '0 0 6px 0', color: 'var(--ink-secondary)' }}>
                  <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>Why it fits:</strong>{' '}
                  {opportunity.whyItMatches.length > 0
                    ? opportunity.whyItMatches.join(' · ')
                    : 'Demonstrated experience matches stated technical requirements.'}
                </p>

                {opportunity.missingRequirements.length > 0 && (
                  <p style={{ margin: '0', color: 'var(--muted)', fontSize: '12px' }}>
                    <strong style={{ fontWeight: 600 }}>Requirement note:</strong> {opportunity.missingRequirements.join(', ')}
                  </p>
                )}
              </div>
            </div>

            {/* Collapsible Cover Letter Preview */}
            {opportunity.coverLetter && (
              <details style={{ margin: '12px 0 16px 0', fontSize: '13px', color: 'var(--muted)' }}>
                <summary style={{ cursor: 'pointer', userSelect: 'none', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                  Inspect drafted cover letter
                </summary>
                <div style={{ marginTop: '10px', padding: '14px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => handleCopyCoverLetter(opportunity.id, opportunity.coverLetter ?? '')}
                    style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '11px', background: 'none', border: '1px solid var(--line)', padding: '3px 8px', borderRadius: '3px', cursor: 'pointer' }}
                  >
                    {copiedId === opportunity.id ? 'Copied' : 'Copy'}
                  </button>
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '12px', lineHeight: 1.6, color: 'var(--ink-secondary)', margin: 0 }}>
                    {opportunity.coverLetter}
                  </pre>
                </div>
              </details>
            )}

            {/* Status / Decision Feedback */}
            {isDecided ? (
              <div style={{ fontSize: '13px', color: 'var(--muted)', padding: '6px 0' }}>
                Decision recorded: <strong>{decisionText}</strong>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() =>
                    decide(
                      opportunity.applicationId,
                      opportunity.id,
                      'APPROVE_AND_APPLY',
                      'Approved for submission',
                    )
                  }
                  disabled={busy === opportunity.id || opportunity.eligibility === 'INELIGIBLE'}
                  className="primary-button"
                >
                  {busy === opportunity.id ? 'Saving…' : 'Approve & Apply'}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    decide(
                      opportunity.applicationId,
                      opportunity.id,
                      'EDIT',
                      'Marked for edit',
                    )
                  }
                  disabled={busy === opportunity.id}
                  className="secondary-button"
                >
                  Edit draft
                </button>

                <button
                  type="button"
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
                  type="button"
                  onClick={() =>
                    decide(
                      opportunity.applicationId,
                      opportunity.id,
                      'ASK_ME',
                      'Flagged for review',
                    )
                  }
                  disabled={busy === opportunity.id}
                  className="secondary-button"
                >
                  Ask me
                </button>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

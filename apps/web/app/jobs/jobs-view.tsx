'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import type { DashboardOpportunity } from '@tanishq/shared';

interface JobsViewProps {
  initialOpportunities: DashboardOpportunity[];
}

export function JobsView({ initialOpportunities }: JobsViewProps) {
  const [search, setSearch] = useState('');
  const [filterRemote, setFilterRemote] = useState(false);
  const [filterHighMatch, setFilterHighMatch] = useState(false);
  const [eligibilityFilter, setEligibilityFilter] = useState<'ALL' | 'ELIGIBLE' | 'LIKELY_ELIGIBLE' | 'UNKNOWN'>('ALL');
  const [sortBy, setSortBy] = useState<'match' | 'recent' | 'company'>('match');
  const [selectedScoreOpp, setSelectedScoreOpp] = useState<DashboardOpportunity | null>(null);

  const filteredOpportunities = useMemo(() => {
    return initialOpportunities
      .filter((opp) => {
        if (search) {
          const query = search.toLowerCase();
          const matchText = `${opp.title} ${opp.company} ${opp.location ?? ''} ${opp.whyItMatches.join(' ')}`.toLowerCase();
          if (!matchText.includes(query)) return false;
        }
        if (filterRemote) {
          const loc = (opp.location ?? '').toLowerCase();
          if (!loc.includes('remote') && !loc.includes('anywhere')) return false;
        }
        if (filterHighMatch && opp.matchScore < 80) {
          return false;
        }
        if (eligibilityFilter !== 'ALL' && opp.eligibility !== eligibilityFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'match') return b.matchScore - a.matchScore;
        if (sortBy === 'recent') return new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime();
        if (sortBy === 'company') return a.company.localeCompare(b.company);
        return 0;
      });
  }, [initialOpportunities, search, filterRemote, filterHighMatch, eligibilityFilter, sortBy]);

  return (
    <div className="jobs-container">
      {/* Restrained Controls Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '20px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by role, company, or skills…"
            aria-label="Search opportunities"
            style={{
              width: '100%',
              padding: '9px 12px',
              fontSize: '13px',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface)',
              color: 'var(--ink)',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: filterHighMatch ? 600 : 450,
              background: filterHighMatch ? 'var(--line-subtle)' : 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--ink)',
              cursor: 'pointer',
            }}
            onClick={() => setFilterHighMatch(!filterHighMatch)}
          >
            Match ≥ 80%
          </button>
          <button
            type="button"
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: filterRemote ? 600 : 450,
              background: filterRemote ? 'var(--line-subtle)' : 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--ink)',
              cursor: 'pointer',
            }}
            onClick={() => setFilterRemote(!filterRemote)}
          >
            Remote only
          </button>
          <select
            value={eligibilityFilter}
            onChange={(e) => setEligibilityFilter(e.target.value as typeof eligibilityFilter)}
            style={{
              padding: '6px 10px',
              fontSize: '12px',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface)',
              color: 'var(--ink)',
            }}
            aria-label="Filter by eligibility"
          >
            <option value="ALL">All eligibility</option>
            <option value="ELIGIBLE">Eligible</option>
            <option value="LIKELY_ELIGIBLE">Likely eligible</option>
            <option value="UNKNOWN">Needs review</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            style={{
              padding: '6px 10px',
              fontSize: '12px',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface)',
              color: 'var(--ink)',
              marginLeft: 'auto',
            }}
            aria-label="Sort opportunities"
          >
            <option value="match">Sort by match</option>
            <option value="recent">Sort by date</option>
            <option value="company">Sort by company</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', fontSize: '12px', color: 'var(--muted)' }}>
        <span>{filteredOpportunities.length} opportunities discovered</span>
        {(search || filterRemote || filterHighMatch || eligibilityFilter !== 'ALL') && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setFilterRemote(false);
              setFilterHighMatch(false);
              setEligibilityFilter('ALL');
            }}
            style={{ background: 'none', border: 'none', color: 'var(--ink)', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Editorial Publication Directory Listing */}
      {filteredOpportunities.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {filteredOpportunities.map((opp) => (
            <article
              key={opp.id}
              style={{
                padding: '24px 0',
                borderBottom: '1px solid var(--line)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '6px' }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {opp.company}
                  </span>
                  <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--ink)', margin: '3px 0 4px', letterSpacing: '-0.015em' }}>
                    {opp.title}
                  </h2>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px', color: 'var(--muted)' }}>
                    <span>{opp.location || 'Location not stated'}</span>
                    <span>·</span>
                    <span>Source: {opp.source}</span>
                    <span>·</span>
                    <span>{opp.recommendedResume.replace('resume_', '').replace('_', ' ')} resume</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => setSelectedScoreOpp(opp)}
                    title="Inspect match calculation"
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--ink)',
                      textDecoration: 'underline',
                      textUnderlineOffset: '3px',
                    }}
                  >
                    {opp.matchScore}% match
                  </button>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'capitalize' }}>
                    {opp.eligibility.toLowerCase().replace('_', ' ')}
                  </span>
                </div>
              </div>

              {opp.whyItMatches.length > 0 && (
                <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', margin: '10px 0 4px', lineHeight: 1.5 }}>
                  <strong style={{ fontWeight: 600 }}>Fit:</strong> {opp.whyItMatches.join(' · ')}
                </p>
              )}

              {opp.missingRequirements.length > 0 && (
                <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '4px 0 0', lineHeight: 1.4 }}>
                  <span style={{ fontWeight: 500 }}>Potential gap:</span> {opp.missingRequirements.join(', ')}
                </p>
              )}

              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '14px' }}>
                <Link
                  href={`/opportunities/${opp.id}`}
                  style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--ink)',
                    textDecoration: 'underline',
                    textUnderlineOffset: '3px',
                  }}
                >
                  Review application →
                </Link>
                <a
                  href={opp.applicationUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: '13px',
                    color: 'var(--muted)',
                  }}
                >
                  Official ATS posting ↗
                </a>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--muted)' }}>
          <p style={{ fontSize: '14px', marginBottom: '12px' }}>No opportunities match your current filters.</p>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setSearch('');
              setFilterRemote(false);
              setFilterHighMatch(false);
              setEligibilityFilter('ALL');
            }}
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Match Explanation Document Drawer / Modal */}
      {selectedScoreOpp && (
        <div className="modal-backdrop" onClick={() => setSelectedScoreOpp(null)}>
          <div
            className="modal-panel"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            style={{ maxWidth: '560px', borderRadius: 'var(--radius-lg)', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}
          >
            <div className="modal-header" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '14px' }}>
              <div>
                <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, color: 'var(--muted)', margin: 0 }}>
                  {selectedScoreOpp.company}
                </p>
                <h2 style={{ fontSize: '17px', fontWeight: 600, margin: '2px 0 0', color: 'var(--ink)' }}>
                  {selectedScoreOpp.title}
                </h2>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setSelectedScoreOpp(null)}
                aria-label="Close dialog"
                style={{ fontSize: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '16px 0', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Qualification Match</span>
              <strong style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink)' }}>{selectedScoreOpp.matchScore}%</strong>
            </div>

            <div style={{ padding: '16px 0', borderBottom: '1px solid var(--line)' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>Why this role fits</h3>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', lineHeight: 1.55, color: 'var(--ink-secondary)' }}>
                {selectedScoreOpp.whyItMatches.map((strength) => (
                  <li key={strength}>{strength}</li>
                ))}
              </ul>
            </div>

            {selectedScoreOpp.missingRequirements.length > 0 && (
              <div style={{ padding: '16px 0', borderBottom: '1px solid var(--line)' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>Potential requirement gaps</h3>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', lineHeight: 1.55, color: 'var(--muted)' }}>
                  {selectedScoreOpp.missingRequirements.map((req) => (
                    <li key={req}>{req}</li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ padding: '16px 0', borderBottom: '1px solid var(--line)' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>Application materials</h3>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
                Tailored resume variant: <strong>{selectedScoreOpp.recommendedResume}</strong>
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px' }}>
              <a
                href={selectedScoreOpp.applicationUrl}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '13px', color: 'var(--muted)', textDecoration: 'underline' }}
              >
                Open posting ↗
              </a>
              <Link
                href="/review"
                onClick={() => setSelectedScoreOpp(null)}
                className="primary-button"
              >
                Review in Queue →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
      {/* Controls Bar */}
      <div className="jobs-controls">
        <div className="search-box">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by role, company, technology, or location…"
            aria-label="Search opportunities"
          />
        </div>

        <div className="filter-group">
          <button
            type="button"
            className={`pill-btn ${filterHighMatch ? 'active' : ''}`}
            onClick={() => setFilterHighMatch(!filterHighMatch)}
          >
            ★ High Match (80%+)
          </button>
          <button
            type="button"
            className={`pill-btn ${filterRemote ? 'active' : ''}`}
            onClick={() => setFilterRemote(!filterRemote)}
          >
            🌐 Remote Only
          </button>
          <select
            value={eligibilityFilter}
            onChange={(e) => setEligibilityFilter(e.target.value as typeof eligibilityFilter)}
            className="select-filter"
            aria-label="Filter by eligibility"
          >
            <option value="ALL">All Eligibility</option>
            <option value="ELIGIBLE">Eligible</option>
            <option value="LIKELY_ELIGIBLE">Likely Eligible</option>
            <option value="UNKNOWN">Needs Review</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="select-filter"
            aria-label="Sort opportunities"
          >
            <option value="match">Sort by Match Score</option>
            <option value="recent">Sort by Date Discovered</option>
            <option value="company">Sort by Company</option>
          </select>
        </div>
      </div>

      <div className="jobs-count-strip">
        <span>Showing {filteredOpportunities.length} opportunities</span>
        {(search || filterRemote || filterHighMatch || eligibilityFilter !== 'ALL') && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setFilterRemote(false);
              setFilterHighMatch(false);
              setEligibilityFilter('ALL');
            }}
            className="clear-filters-btn"
          >
            Reset filters
          </button>
        )}
      </div>

      {/* Opportunities Grid */}
      {filteredOpportunities.length > 0 ? (
        <div className="jobs-grid">
          {filteredOpportunities.map((opp) => (
            <article key={opp.id} className="job-card">
              <div className="job-card-header">
                <div>
                  <span className="job-company">{opp.company}</span>
                  <h3 className="job-title">{opp.title}</h3>
                  <p className="job-location">{opp.location || 'Location not specified'}</p>
                </div>
                <button
                  type="button"
                  className="score-badge-btn"
                  onClick={() => setSelectedScoreOpp(opp)}
                  title="Click to see why you match"
                >
                  <span className="score-val">{opp.matchScore}%</span>
                  <span className="score-lbl">MATCH</span>
                </button>
              </div>

              <div className="job-card-meta">
                <span className={`eligibility-tag ${opp.eligibility.toLowerCase()}`}>
                  {opp.eligibility.replaceAll('_', ' ')}
                </span>
                <span className="source-tag">{opp.source}</span>
                <span className="variant-tag">{opp.recommendedResume.replace('resume_', '').replace('_', ' ')} resume</span>
              </div>

              {opp.whyItMatches.length > 0 && (
                <div className="job-strengths">
                  <span className="strength-label">Strong match:</span>
                  <div className="tags-row">
                    {opp.whyItMatches.slice(0, 3).map((strength) => (
                      <span key={strength} className="strength-pill">
                        ✓ {strength}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {opp.missingRequirements.length > 0 && (
                <div className="job-gap">
                  <span className="gap-label">Potential gap:</span> {opp.missingRequirements.join(' · ')}
                </div>
              )}

              <div className="job-card-footer">
                <button
                  type="button"
                  onClick={() => setSelectedScoreOpp(opp)}
                  className="btn-text-match"
                >
                  Score Breakdown →
                </button>
                <div className="action-links">
                  <Link href={`/opportunities/${opp.id}`} className="secondary-button" style={{ padding: '7px 12px', fontSize: '12px' }}>
                    Details
                  </Link>
                  <Link href="/review" className="primary-button" style={{ padding: '7px 14px', fontSize: '12px' }}>
                    Review in Queue →
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-icon">🔍</span>
          <h3>No opportunities match your current filters.</h3>
          <p>
            Try adjusting your search terms, clearing filters, or running a fresh scan from the Command Center.
          </p>
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

      {/* Match Explanation Modal / Drawer */}
      {selectedScoreOpp && (
        <div className="modal-backdrop" onClick={() => setSelectedScoreOpp(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal-header">
              <div>
                <p className="modal-eyebrow">{selectedScoreOpp.company}</p>
                <h2>{selectedScoreOpp.title}</h2>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setSelectedScoreOpp(null)}
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <div className="modal-score-summary">
              <div className="modal-score-big">
                <strong>{selectedScoreOpp.matchScore}%</strong>
                <span>Overall Qualification Match</span>
              </div>
              <div className="modal-status-badge">
                <span>Eligibility Status:</span>
                <strong>{selectedScoreOpp.eligibility.replaceAll('_', ' ')}</strong>
              </div>
            </div>

            <div className="modal-section">
              <h3>Why you match this role</h3>
              <ul className="modal-list">
                {selectedScoreOpp.whyItMatches.map((strength) => (
                  <li key={strength}>{strength}</li>
                ))}
              </ul>
            </div>

            {selectedScoreOpp.missingRequirements.length > 0 && (
              <div className="modal-section modal-gap-section">
                <h3>Potential gaps &amp; missing requirements</h3>
                <ul className="modal-list">
                  {selectedScoreOpp.missingRequirements.map((req) => (
                    <li key={req}>{req}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="modal-section">
              <h3>Tailored Application Materials</h3>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '4px 0 8px' }}>
                Recommended master resume variant: <strong>{selectedScoreOpp.recommendedResume}</strong>
              </p>
              {selectedScoreOpp.coverLetter && (
                <details className="materials" style={{ marginTop: '8px' }}>
                  <summary>Preview drafted cover letter</summary>
                  <pre>{selectedScoreOpp.coverLetter}</pre>
                </details>
              )}
            </div>

            <div className="modal-footer">
              <a
                href={selectedScoreOpp.applicationUrl}
                target="_blank"
                rel="noreferrer"
                className="secondary-button"
              >
                Open Official ATS Posting ↗
              </a>
              <Link
                href="/review"
                onClick={() => setSelectedScoreOpp(null)}
                className="primary-button"
              >
                Go to Review Queue →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

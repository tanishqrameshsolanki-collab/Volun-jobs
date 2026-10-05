'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import type { ApplicationListItem } from '../../lib/opportunity-data';

interface ApplicationsViewProps {
  initialApplications: ApplicationListItem[];
}

const STAGES = [
  { id: 'ALL', label: 'All' },
  { id: 'READY_FOR_REVIEW', label: 'Ready for Review' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'SUBMITTED', label: 'Applied / Submitted' },
  { id: 'OA', label: 'Assessment' },
  { id: 'INTERVIEW', label: 'Interview' },
  { id: 'OFFER', label: 'Offer' },
  { id: 'REJECTED', label: 'Archived / Rejected' },
];

export function ApplicationsView({ initialApplications }: ApplicationsViewProps) {
  const [applications, setApplications] = useState<ApplicationListItem[]>(initialApplications);
  const [activeStage, setActiveStage] = useState('ALL');
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: applications.length };
    for (const app of applications) {
      counts[app.status] = (counts[app.status] ?? 0) + 1;
    }
    return counts;
  }, [applications]);

  const filtered = useMemo(() => {
    return applications.filter((app) => {
      if (activeStage !== 'ALL' && app.status !== activeStage) {
        return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const text = `${app.title} ${app.company} ${app.location ?? ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [applications, activeStage, search]);

  async function updateStatus(applicationId: string, newStatus: string) {
    setUpdatingId(applicationId);
    try {
      const res = await fetch('/api/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Status update failed');

      setApplications((prev) =>
        prev.map((item) =>
          item.id === applicationId ? { ...item, status: newStatus as ApplicationListItem['status'] } : item,
        ),
      );
      setToastMessage(`Application status updated to ${newStatus.replaceAll('_', ' ')}`);
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="applications-container">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="app-toast" role="status" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
          {toastMessage}
        </div>
      )}

      {/* Stage Tabs */}
      <div className="pipeline-tabs" role="tablist">
        {STAGES.map((stage) => {
          const count = stage.id === 'ALL' ? applications.length : (stageCounts[stage.id] ?? 0);
          return (
            <button
              key={stage.id}
              role="tab"
              aria-selected={activeStage === stage.id}
              onClick={() => setActiveStage(stage.id)}
              className={`pipeline-tab ${activeStage === stage.id ? 'active' : ''}`}
            >
              <span>{stage.label}</span>
              <span className="tab-count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="search-box" style={{ margin: '20px 0' }}>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter tracked applications by company or role…"
          aria-label="Filter applications"
        />
      </div>

      {/* Applications List */}
      {filtered.length > 0 ? (
        <div className="app-list">
          {filtered.map((app) => (
            <article key={app.id} className="app-row-card">
              <div className="app-row-main">
                <div className="app-row-header">
                  <span className="app-company">{app.company}</span>
                  <span className={`app-status-badge status-${app.status.toLowerCase()}`}>
                    {app.status.replaceAll('_', ' ')}
                  </span>
                </div>
                <h3 className="app-title">{app.title}</h3>
                <div className="app-meta-row">
                  <span>{app.location || 'Remote'}</span>
                  <span>·</span>
                  <span>Match: <strong>{app.matchScore}%</strong></span>
                  <span>·</span>
                  <span>Resume: {app.resumeVariant.replace('resume_', '').replace('_', ' ')}</span>
                  {app.submittedAt && (
                    <>
                      <span>·</span>
                      <span>Submitted: {new Date(app.submittedAt).toLocaleDateString()}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="app-row-actions">
                <div className="status-changer">
                  <label htmlFor={`status-select-${app.id}`} className="sr-only">Update Status</label>
                  <select
                    id={`status-select-${app.id}`}
                    value={app.status}
                    disabled={updatingId === app.id}
                    onChange={(e) => updateStatus(app.id, e.target.value)}
                    className="select-status"
                  >
                    <option value="READY_FOR_REVIEW">Ready for Review</option>
                    <option value="APPROVED">Approved</option>
                    <option value="SUBMITTED">Submitted / Applied</option>
                    <option value="OA">Assessment / OA</option>
                    <option value="INTERVIEW">Interview Scheduled</option>
                    <option value="OFFER">Offer Received</option>
                    <option value="REJECTED">Archived / Rejected</option>
                  </select>
                </div>

                <div className="button-group">
                  {app.status === 'READY_FOR_REVIEW' && (
                    <Link href="/review" className="primary-button" style={{ padding: '8px 14px', fontSize: '12px' }}>
                      Review Now →
                    </Link>
                  )}
                  {app.status === 'INTERVIEW' && (
                    <Link href="/interviews" className="primary-button" style={{ padding: '8px 14px', fontSize: '12px' }}>
                      Interview Prep →
                    </Link>
                  )}
                  <a
                    href={app.applicationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="secondary-button"
                    style={{ padding: '8px 12px', fontSize: '12px' }}
                  >
                    ATS Link ↗
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-icon" style={{ background: 'var(--line-subtle)', borderRadius: '8px', width: '38px', height: '38px', margin: '0 auto 12px', display: 'grid', placeItems: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
          </span>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>No applications in this pipeline stage</h3>
          <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '4px auto 16px', maxWidth: '440px' }}>
            {activeStage === 'ALL'
              ? 'You have not added or qualified any applications yet. Scan public opportunities or review recommended roles.'
              : `No applications currently have status "${activeStage.replaceAll('_', ' ')}".`}
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <Link href="/jobs" className="primary-button">
              Explore Discovered Jobs <span>→</span>
            </Link>
            <Link href="/review" className="secondary-button">
              Open Review Queue <span>→</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

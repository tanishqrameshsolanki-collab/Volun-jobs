'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import type { ApplicationListItem } from '../../lib/opportunity-data';

interface ApplicationsViewProps {
  initialApplications: ApplicationListItem[];
}

const STAGES = [
  { id: 'ALL', label: 'All' },
  { id: 'READY_FOR_REVIEW', label: 'Review' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'SUBMITTED', label: 'Submitted' },
  { id: 'OA', label: 'Assessment' },
  { id: 'INTERVIEW', label: 'Interview' },
  { id: 'OFFER', label: 'Offer' },
  { id: 'REJECTED', label: 'Archived' },
];

function getStatusDotColor(status: string): string {
  switch (status) {
    case 'READY_FOR_REVIEW':
      return '#d97706';
    case 'APPROVED':
      return '#16a34a';
    case 'SUBMITTED':
    case 'APPLYING':
      return '#0284c7';
    case 'OA':
      return '#7c3aed';
    case 'INTERVIEW':
      return '#059669';
    case 'OFFER':
      return '#d97706';
    case 'REJECTED':
    default:
      return '#94a3b8';
  }
}

function formatStatusLabel(status: string): string {
  switch (status) {
    case 'READY_FOR_REVIEW':
      return 'Ready for review';
    case 'APPROVED':
      return 'Approved';
    case 'SUBMITTED':
      return 'Submitted';
    case 'OA':
      return 'Assessment';
    case 'INTERVIEW':
      return 'Interview';
    case 'OFFER':
      return 'Offer';
    case 'REJECTED':
      return 'Archived';
    default:
      return status.replaceAll('_', ' ');
  }
}

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
      setToastMessage(`Status updated to ${formatStatusLabel(newStatus)}`);
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
          {toastMessage}
        </div>
      )}

      {/* Control bar: Stage Tabs + Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
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

        <div style={{ width: '260px' }}>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by company or role…"
            aria-label="Filter applications"
            style={{
              width: '100%',
              padding: '7px 12px',
              fontSize: '13px',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-sm)',
              background: '#ffffff',
              color: 'var(--ink)',
            }}
          />
        </div>
      </div>

      {/* Applications Table */}
      {filtered.length > 0 ? (
        <div className="app-table-container">
          <div className="app-table-head">
            <span style={{ width: '180px' }}>Company</span>
            <span style={{ flex: 1, minWidth: '220px' }}>Role</span>
            <span style={{ width: '170px' }}>Status</span>
            <span style={{ width: '80px', textAlign: 'right' }}>Match</span>
            <span style={{ width: '120px', textAlign: 'right' }}>Date</span>
            <span style={{ width: '140px', textAlign: 'right' }}>Action</span>
          </div>

          <div className="app-table-body">
            {filtered.map((app) => (
              <div key={app.id} className="app-table-row">
                {/* Company & Location */}
                <div className="app-cell app-cell-company" style={{ width: '180px' }}>
                  <span className="app-company-name">{app.company}</span>
                  <span className="app-location-sub">{app.location || 'Remote'}</span>
                </div>

                {/* Role Title */}
                <div className="app-cell app-cell-title" style={{ flex: 1, minWidth: '220px' }}>
                  <span className="app-role-name">{app.title}</span>
                  <span className="app-variant-sub">
                    {app.resumeVariant.replace('resume_', '').replace('_', ' ')}
                  </span>
                </div>

                {/* Status Column */}
                <div className="app-cell app-cell-status" style={{ width: '170px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        backgroundColor: getStatusDotColor(app.status),
                        display: 'inline-block',
                        flexShrink: 0,
                      }}
                    />
                    <select
                      id={`status-select-${app.id}`}
                      aria-label={`Status for ${app.title} at ${app.company}`}
                      value={app.status}
                      disabled={updatingId === app.id}
                      onChange={(e) => updateStatus(app.id, e.target.value)}
                      className="app-status-select"
                    >
                      <option value="READY_FOR_REVIEW">Ready for review</option>
                      <option value="APPROVED">Approved</option>
                      <option value="SUBMITTED">Submitted</option>
                      <option value="OA">Assessment</option>
                      <option value="INTERVIEW">Interview</option>
                      <option value="OFFER">Offer</option>
                      <option value="REJECTED">Archived</option>
                    </select>
                  </div>
                </div>

                {/* Match Score */}
                <div className="app-cell app-cell-match" style={{ width: '80px', textAlign: 'right' }}>
                  <span className="app-match-number">{app.matchScore}%</span>
                </div>

                {/* Date */}
                <div className="app-cell app-cell-date" style={{ width: '120px', textAlign: 'right' }}>
                  <span className="app-date-text">
                    {app.submittedAt
                      ? new Date(app.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                      : 'Draft'}
                  </span>
                </div>

                {/* Action Links */}
                <div className="app-cell app-cell-actions" style={{ width: '140px', textAlign: 'right' }}>
                  {app.status === 'READY_FOR_REVIEW' && (
                    <Link href="/review" className="app-action-link" style={{ marginRight: '10px' }}>
                      Review →
                    </Link>
                  )}
                  {app.status === 'INTERVIEW' && (
                    <Link href="/interviews" className="app-action-link" style={{ marginRight: '10px' }}>
                      Prep →
                    </Link>
                  )}
                  <a
                    href={app.applicationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="app-action-link-secondary"
                  >
                    ATS ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 6px' }}>
            No applications in this view.
          </p>
          <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '0 0 20px' }}>
            {activeStage === 'ALL'
              ? 'Your applications will appear here as you review and apply to opportunities.'
              : `No applications currently have status "${formatStatusLabel(activeStage)}".`}
          </p>
          <Link href="/jobs" className="secondary-button">
            Find opportunities <span>→</span>
          </Link>
        </div>
      )}
    </div>
  );
}

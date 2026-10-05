'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { CandidateProfile } from '@tanishq/shared';

interface InterviewItem {
  applicationId: string;
  jobId: string;
  company: string;
  title: string;
  location?: string;
  status: string;
  date: string;
  round: string;
  notes: string;
  contact: string;
  resumeVariant: string;
}

interface InterviewsViewProps {
  initialInterviews: InterviewItem[];
  profile: CandidateProfile;
}

export function InterviewsView({ initialInterviews, profile }: InterviewsViewProps) {
  const [interviews, setInterviews] = useState<InterviewItem[]>(initialInterviews);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [round, setRound] = useState('Technical Interview');
  const [date, setDate] = useState('');
  const [contact, setContact] = useState('');
  const [notes, setNotes] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  function getDaysUntil(dateStr: string) {
    const target = new Date(dateStr);
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'Completed';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `In ${diffDays} days`;
  }

  async function handleAddInterview(e: React.FormEvent) {
    e.preventDefault();
    if (!company.trim() || !date) return;
    setSaving(true);
    try {
      const res = await fetch('/api/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: 'manual-' + Date.now(),
          date,
          round,
          notes,
          contact,
        }),
      });

      const newItem: InterviewItem = {
        applicationId: 'manual-' + Date.now(),
        jobId: 'manual-' + Date.now(),
        company,
        title: role || 'Software Engineer',
        status: 'INTERVIEW',
        date,
        round,
        notes,
        contact,
        resumeVariant: 'resume_fullstack',
      };
      setInterviews((prev) => [newItem, ...prev]);
      setShowAddModal(false);
      setToast(`Interview for ${company} scheduled.`);
      setTimeout(() => setToast(null), 3500);

      setCompany('');
      setRole('');
      setDate('');
      setNotes('');
      setContact('');
    } catch {
      setShowAddModal(false);
    } finally {
      setSaving(false);
    }
  }

  const upcomingCount = interviews.filter((i) => getDaysUntil(i.date) !== 'Completed').length;

  return (
    <div className="interviews-container">
      {toast && (
        <div className="app-toast" role="status" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
          {toast}
        </div>
      )}

      {/* Top action row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: '16px', borderBottom: '1px solid var(--line)', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
            Scheduled rounds ({upcomingCount} upcoming)
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="primary-button"
        >
          + Log interview round
        </button>
      </div>

      <div className="interviews-layout">
        {/* Left Column: Scheduled Interviews List */}
        <div className="interviews-main">
          {interviews.length > 0 ? (
            <div className="agenda-list">
              {interviews.map((item, idx) => {
                const days = getDaysUntil(item.date);
                const isUpcoming = days !== 'Completed';
                return (
                  <article key={idx} className="agenda-item">
                    <div className="agenda-time-col">
                      <span className={`agenda-relative-tag ${isUpcoming ? 'upcoming' : 'past'}`}>
                        {days}
                      </span>
                      <time className="agenda-full-date">
                        {new Date(item.date).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </time>
                      <span className="agenda-clock-time">
                        {new Date(item.date).toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="agenda-content-col">
                      <div className="agenda-header-line">
                        <span className="agenda-company">{item.company}</span>
                        <span className="agenda-round-label">{item.round}</span>
                      </div>
                      <h3 className="agenda-title">{item.title}</h3>

                      {(item.contact || item.notes) && (
                        <div className="agenda-details-box">
                          {item.contact && (
                            <p className="agenda-contact-line">
                              <strong>Contact:</strong> {item.contact}
                            </p>
                          )}
                          {item.notes && (
                            <p className="agenda-notes-line">
                              {item.notes}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="agenda-footer-line">
                        <span className="agenda-variant-note">
                          Resume variant: {item.resumeVariant.replace('resume_', '')}
                        </span>
                        <Link href="/applications" className="agenda-app-link">
                          View in applications →
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 6px' }}>
                No interviews currently scheduled.
              </p>
              <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '0 0 20px' }}>
                When a recruiter or hiring team reaches out, log the round here to track technical preparation notes and factual talking points.
              </p>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="secondary-button"
              >
                Log an interview round <span>→</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Verified Candidate Facts for Interview Prep */}
        <aside className="interviews-sidebar">
          <div className="prep-document">
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px' }}>
              Verified candidate facts
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 16px', lineHeight: 1.4 }}>
              Reference verified facts submitted in your application to ensure consistency during technical and behavioral rounds.
            </p>

            <div className="fact-item">
              <span className="fact-lbl">Candidate</span>
              <strong className="fact-val">{profile.personalInformation.fullName}</strong>
            </div>

            <div className="fact-item">
              <span className="fact-lbl">Education</span>
              <span className="fact-val">
                {profile.education[0]?.degree} ({profile.education[0]?.institution}, {profile.education[0]?.expectedGraduationYear})
              </span>
            </div>

            <div className="fact-item">
              <span className="fact-lbl">Work authorization</span>
              <span className="fact-val">{profile.constraints.workAuthorization || 'Authorized to work'}</span>
            </div>

            <div className="fact-item">
              <span className="fact-lbl">Sponsorship</span>
              <span className="fact-val">{profile.constraints.sponsorship || 'None required'}</span>
            </div>

            <div className="fact-item" style={{ borderBottom: 'none' }}>
              <span className="fact-lbl">Verified skills</span>
              <div className="skill-list" style={{ marginTop: '8px' }}>
                {profile.skills.languages?.slice(0, 5).map((s) => (
                  <span key={s}>{s}</span>
                ))}
                {profile.skills.backend?.slice(0, 4).map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--line)' }}>
              <Link href="/profile" className="secondary-button" style={{ fontSize: '12px', display: 'block', textAlign: 'center' }}>
                Edit candidate facts →
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {/* Log Interview Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div>
                <p className="modal-eyebrow">Interview Tracker</p>
                <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '2px 0 0' }}>Log interview round</h2>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowAddModal(false)}
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddInterview} className="editor" style={{ marginTop: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label>
                  Company name *
                  <input
                    type="text"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Anthropic, Databricks"
                  />
                </label>
                <label>
                  Job title
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Software Engineer Intern"
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label>
                  Round type
                  <select value={round} onChange={(e) => setRound(e.target.value)}>
                    <option value="Recruiter Screen">Recruiter Screen</option>
                    <option value="Technical Interview">Technical Interview</option>
                    <option value="System Design">System Design</option>
                    <option value="Behavioral / Leadership">Behavioral / Leadership</option>
                    <option value="Hiring Manager Round">Hiring Manager Round</option>
                    <option value="Final Round / Onsite">Final Round / Onsite</option>
                  </select>
                </label>
                <label>
                  Date &amp; time *
                  <input
                    type="datetime-local"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </label>
              </div>

              <label>
                Interviewer / recruiter contact
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="e.g. Sarah Jenkins (Engineering Lead)"
                />
              </label>

              <label>
                Preparation notes
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Topics to review: concurrency, project architecture, questions for interviewer..."
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="secondary-button"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="primary-button"
                >
                  {saving ? 'Saving…' : 'Save round'} <span>→</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

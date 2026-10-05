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

      // Optimistically add to state
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

      // Reset form
      setCompany('');
      setRole('');
      setDate('');
      setNotes('');
      setContact('');
    } catch {
      // Local fallback
      setShowAddModal(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="interviews-container">
      {toast && (
        <div className="app-toast" role="status">
          ✓ {toast}
        </div>
      )}

      {/* Top action header */}
      <div className="interviews-header-actions">
        <div>
          <h2>Upcoming Rounds ({interviews.filter((i) => getDaysUntil(i.date) !== 'Completed').length})</h2>
          <p className="muted">Keep your interview rounds organized with grounded candidate facts.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="primary-button"
        >
          + Log Interview Round
        </button>
      </div>

      <div className="interviews-layout">
        {/* Left Column: Scheduled Interviews */}
        <div className="interviews-main">
          {interviews.length > 0 ? (
            <div className="interviews-list">
              {interviews.map((item, idx) => {
                const days = getDaysUntil(item.date);
                const isUpcoming = days !== 'Completed';
                return (
                  <article key={idx} className={`interview-card ${isUpcoming ? 'upcoming' : 'past'}`}>
                    <div className="interview-top">
                      <div>
                        <span className="interview-company">{item.company}</span>
                        <h3 className="interview-title">{item.title}</h3>
                        <span className="interview-round">{item.round}</span>
                      </div>
                      <div className="interview-badge-box">
                        <span className={`time-badge ${isUpcoming ? 'badge-soon' : 'badge-done'}`}>
                          {days}
                        </span>
                        <span className="interview-date">
                          {new Date(item.date).toLocaleDateString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    {(item.contact || item.notes) && (
                      <div className="interview-notes-box">
                        {item.contact && (
                          <p><strong>Contact / Interviewer:</strong> {item.contact}</p>
                        )}
                        {item.notes && (
                          <p><strong>Prep Notes:</strong> {item.notes}</p>
                        )}
                      </div>
                    )}

                    <div className="interview-footer">
                      <span className="muted">Variant used: {item.resumeVariant.replace('resume_', '')}</span>
                      <Link href="/applications" className="secondary-button" style={{ padding: '6px 10px', fontSize: '11px' }}>
                        View in Application Tracker →
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-icon">📅</span>
              <h3>No interviews currently scheduled.</h3>
              <p>
                When an application reaches the interview round, or when a recruiter contacts you, log it here to track preparation notes and grounded facts.
              </p>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="primary-button"
              >
                Log an Interview Round
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Grounded Fact Sheet for Interview Prep */}
        <aside className="interview-sidebar">
          <div className="prep-sheet-card">
            <h3>Verified Candidate Facts</h3>
            <p className="muted" style={{ fontSize: '12px', margin: '4px 0 16px' }}>
              Reference verified facts submitted in your resume to ensure consistency during rounds.
            </p>

            <div className="fact-item">
              <span className="fact-lbl">Candidate Name</span>
              <strong className="fact-val">{profile.personalInformation.fullName}</strong>
            </div>

            <div className="fact-item">
              <span className="fact-lbl">Education</span>
              <span className="fact-val">
                {profile.education[0]?.degree} ({profile.education[0]?.institution}, {profile.education[0]?.expectedGraduationYear})
              </span>
            </div>

            <div className="fact-item">
              <span className="fact-lbl">Work Authorization</span>
              <span className="fact-val">{profile.constraints.workAuthorization || 'Authorized'}</span>
            </div>

            <div className="fact-item">
              <span className="fact-lbl">Sponsorship</span>
              <span className="fact-val">{profile.constraints.sponsorship || 'None required'}</span>
            </div>

            <div className="fact-item" style={{ marginTop: '12px' }}>
              <span className="fact-lbl">Key Technical Skills</span>
              <div className="skill-list" style={{ marginTop: '6px' }}>
                {profile.skills.languages?.slice(0, 4).map((s) => (
                  <span key={s}>{s}</span>
                ))}
                {profile.skills.backend?.slice(0, 3).map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '18px', paddingTop: '12px', borderTop: '1px solid var(--line)' }}>
              <Link href="/profile" className="secondary-button" style={{ fontSize: '12px', display: 'block', textAlign: 'center' }}>
                Edit Full Candidate Facts →
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {/* Log Interview Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal-header">
              <div>
                <p className="modal-eyebrow">Interview Tracker</p>
                <h2>Log Interview Round</h2>
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
                  Company Name *
                  <input
                    type="text"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Anthropic, Google, NVIDIA"
                  />
                </label>
                <label>
                  Job Title
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
                  Interview Round
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
                  Date &amp; Time *
                  <input
                    type="datetime-local"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </label>
              </div>

              <label>
                Interviewer / Recruiter Contact
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="e.g. Sarah Jenkins (Engineering Lead)"
                />
              </label>

              <label>
                Preparation Notes &amp; Topics to Cover
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Review distributed consensus, graph traversal, project architecture..."
                />
              </label>

              <div className="modal-footer" style={{ marginTop: '20px' }}>
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
                  {saving ? 'Saving…' : 'Save Interview'} <span>→</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

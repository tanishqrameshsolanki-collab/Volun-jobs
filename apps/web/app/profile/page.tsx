import Link from 'next/link';
import { loadCandidateProfile } from '../../lib/candidate-profile';
import { getProfileCompleteness, listUserInputRequired } from '@tanishq/shared';
import ProfileEditor from './profile-editor';

export default async function ProfilePage() {
  const profile = await loadCandidateProfile();
  const completeness = getProfileCompleteness(profile);
  const missing = listUserInputRequired(profile);

  return (
    <main className="profile-page" style={{ maxWidth: '960px', margin: '0 auto', padding: '36px 32px 72px' }}>
      {/* Top Header */}
      <div className="desk-briefing" style={{ paddingBottom: '24px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <Link className="back" href="/" style={{ marginBottom: '14px' }}>
              ← Overview
            </Link>
            <h1 style={{ fontSize: '26px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)', margin: '0 0 6px' }}>
              Candidate profile
            </h1>
            <p className="desk-lead" style={{ margin: 0 }}>
              Facts from your resume remain traceable across all applications. Keep inputs current to guide role evaluation and tailoring.
            </p>
          </div>

          <div style={{ fontSize: '13px', color: 'var(--muted)', textAlign: 'right' }}>
            <strong style={{ color: 'var(--ink)' }}>{completeness.knownFacts}</strong> verified facts ·{' '}
            <span style={{ color: completeness.userInputRequired > 0 ? '#b45309' : 'var(--muted)' }}>
              {completeness.userInputRequired} inputs needed
            </span>
          </div>
        </div>
      </div>

      {/* Profile Document Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
        {/* Section 1: Personal */}
        <section className="profile-doc-section">
          <div className="profile-doc-header">
            <h2>Personal information</h2>
            <span className="profile-doc-badge">Source: Resume</span>
          </div>
          <div className="profile-doc-content">
            <div className="profile-field-row">
              <span className="profile-field-label">Full name</span>
              <span className="profile-field-value">{profile.personalInformation.fullName}</span>
            </div>
            <div className="profile-field-row">
              <span className="profile-field-label">Location</span>
              <span className="profile-field-value">{profile.personalInformation.location}</span>
            </div>
            <div className="profile-field-row">
              <span className="profile-field-label">Email</span>
              <span className="profile-field-value">{profile.personalInformation.email}</span>
            </div>
            <div className="profile-field-row">
              <span className="profile-field-label">Phone</span>
              <span className="profile-field-value">{profile.personalInformation.phone}</span>
            </div>
          </div>
        </section>

        {/* Section 2: Education */}
        <section className="profile-doc-section">
          <div className="profile-doc-header">
            <h2>Education</h2>
            <span className="profile-doc-badge">Source: Resume</span>
          </div>
          <div className="profile-doc-content">
            {profile.education.map((item) => (
              <div key={item.institution} className="profile-entry-block">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
                    {item.institution}
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    Expected {item.expectedGraduationYear}
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '4px 0 0' }}>
                  {item.degree}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Experience */}
        <section className="profile-doc-section">
          <div className="profile-doc-header">
            <h2>Experience</h2>
            <span className="profile-doc-badge">Source: Resume</span>
          </div>
          <div className="profile-doc-content">
            {profile.experience.map((item) => (
              <div key={`${item.company}-${item.startDate}`} className="profile-entry-block">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
                    {item.title} · <span style={{ fontWeight: 500, color: 'var(--muted)' }}>{item.company}</span>
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    {item.startDate} – Present
                  </span>
                </div>
                {item.bullets && item.bullets.length > 0 && (
                  <ul style={{ margin: '8px 0 0', paddingLeft: '18px', fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>
                    {item.bullets.map((b, idx) => (
                      <li key={idx} style={{ marginBottom: '4px' }}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Section 4: Projects */}
        <section className="profile-doc-section">
          <div className="profile-doc-header">
            <h2>Projects</h2>
            <span className="profile-doc-badge">Source: Resume</span>
          </div>
          <div className="profile-doc-content">
            {profile.projects.map((item) => (
              <div key={item.name} className="profile-entry-block">
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
                  {item.name}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '4px 0 0', lineHeight: 1.45 }}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 5: Skills */}
        <section className="profile-doc-section">
          <div className="profile-doc-header">
            <h2>Technical skills</h2>
            <span className="profile-doc-badge">Source: Resume</span>
          </div>
          <div className="profile-doc-content">
            <div className="skill-list" style={{ marginTop: '4px' }}>
              {Object.entries(profile.skills).flatMap(([group, skills]) =>
                skills.map((skill) => (
                  <span key={`${group}-${skill}`}>{skill}</span>
                )),
              )}
            </div>
          </div>
        </section>

        {/* Section 6: Candidate Inputs & Preferences Editor */}
        <section className="profile-doc-section" id="settings">
          <div className="profile-doc-header">
            <h2>Preferences &amp; constraints</h2>
            <span className="profile-doc-badge" style={{ color: 'var(--ink)' }}>Editable</span>
          </div>

          {missing.length > 0 && (
            <div
              style={{
                marginBottom: '20px',
                padding: '12px 16px',
                border: '1px solid #fde68a',
                borderRadius: 'var(--radius-sm)',
                background: '#fffbeb',
                fontSize: '12px',
                color: '#92400e',
                lineHeight: 1.5,
              }}
            >
              <strong>Inputs needed for full automation:</strong>{' '}
              {missing.join(' · ')}
            </div>
          )}

          <ProfileEditor profile={profile} />
        </section>
      </div>
    </main>
  );
}

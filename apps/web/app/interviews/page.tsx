import Link from 'next/link';
import { loadCandidateProfile } from '../../lib/candidate-profile';
import { loadApplicationsList } from '../../lib/opportunity-data';
import { InterviewsView } from './interviews-view';

export default async function InterviewsPage() {
  const profile = await loadCandidateProfile();
  const applications = await loadApplicationsList();

  const interviews = applications
    .filter((app) => app.status === 'INTERVIEW' || app.interview)
    .map((app) => ({
      applicationId: app.id,
      jobId: app.jobId,
      company: app.company,
      title: app.title,
      location: app.location,
      status: app.status,
      date: app.interview?.date || new Date().toISOString(),
      round: app.interview?.round || 'Technical Interview',
      notes: app.interview?.notes || '',
      contact: app.interview?.contact || '',
      resumeVariant: app.resumeVariant,
    }));

  return (
    <main className="profile-page" style={{ maxWidth: '1120px', margin: '0 auto', padding: '36px 32px 72px' }}>
      <div className="desk-briefing" style={{ paddingBottom: '24px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <Link className="back" href="/" style={{ marginBottom: '14px' }}>
              ← Overview
            </Link>
            <h1 style={{ fontSize: '26px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)', margin: '0 0 6px' }}>
              Interviews &amp; reminders
            </h1>
            <p className="desk-lead" style={{ margin: 0 }}>
              Track scheduled rounds, technical preparation notes, and verified candidate facts.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Link href="/applications" className="secondary-button">
              Applications <span>→</span>
            </Link>
          </div>
        </div>
      </div>

      <InterviewsView initialInterviews={interviews} profile={profile} />
    </main>
  );
}

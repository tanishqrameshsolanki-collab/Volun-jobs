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
    <main className="profile-page" style={{ maxWidth: '1180px', margin: '0 auto', padding: '38px 32px 70px' }}>
      <div className="profile-head" style={{ marginBottom: '24px' }}>
        <div>
          <Link className="back" href="/">
            ← Dashboard
          </Link>
          <p className="eyebrow accent">Interview Readiness</p>
          <h1>Interviews &amp; Reminders</h1>
          <p className="lead">
            Track interview dates, technical rounds, preparation notes, and verified candidate facts to ensure 100% truthful, consistent interview execution.
          </p>
        </div>
        <div style={{ alignSelf: 'flex-start' }}>
          <Link href="/applications" className="secondary-button" style={{ display: 'inline-block' }}>
            Application Tracker <span>→</span>
          </Link>
        </div>
      </div>

      <InterviewsView initialInterviews={interviews} profile={profile} />
    </main>
  );
}

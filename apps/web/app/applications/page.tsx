import Link from 'next/link';
import { loadApplicationsList } from '../../lib/opportunity-data';
import { ApplicationsView } from './applications-view';

export default async function ApplicationsPage() {
  const applications = await loadApplicationsList();

  return (
    <main className="profile-page" style={{ maxWidth: '1120px', margin: '0 auto', padding: '36px 32px 72px' }}>
      <div className="desk-briefing" style={{ paddingBottom: '24px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <Link className="back" href="/" style={{ marginBottom: '14px' }}>
              ← Overview
            </Link>
            <h1 style={{ fontSize: '26px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)', margin: '0 0 6px' }}>
              Applications
            </h1>
            <p className="desk-lead" style={{ margin: 0 }}>
              Track submissions, technical assessments, interviews, and offers across your pipeline.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Link href="/review" className="secondary-button">
              Review queue <span>→</span>
            </Link>
            <Link href="/command-center" className="primary-button">
              Operations <span>→</span>
            </Link>
          </div>
        </div>
      </div>

      <ApplicationsView initialApplications={applications} />
    </main>
  );
}

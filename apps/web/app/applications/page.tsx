import Link from 'next/link';
import { loadApplicationsList } from '../../lib/opportunity-data';
import { ApplicationsView } from './applications-view';

export default async function ApplicationsPage() {
  const applications = await loadApplicationsList();

  return (
    <main className="profile-page" style={{ maxWidth: '1180px', margin: '0 auto', padding: '38px 32px 70px' }}>
      <div className="profile-head" style={{ marginBottom: '24px' }}>
        <div>
          <Link className="back" href="/">
            ← Dashboard
          </Link>
          <p className="eyebrow accent">Application Pipeline</p>
          <h1>Application Tracker</h1>
          <p className="lead">
            Manage your full candidate pipeline from preparation and review to interviews, assessments, and offers.
          </p>
        </div>
        <div style={{ alignSelf: 'flex-start', display: 'flex', gap: '10px' }}>
          <Link href="/review" className="secondary-button" style={{ display: 'inline-block' }}>
            Review Queue <span>→</span>
          </Link>
          <Link href="/command-center" className="primary-button" style={{ display: 'inline-block' }}>
            Command Center <span>→</span>
          </Link>
        </div>
      </div>

      <ApplicationsView initialApplications={applications} />
    </main>
  );
}

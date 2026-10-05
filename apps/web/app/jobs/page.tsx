import Link from 'next/link';
import { loadPersistedOpportunities } from '../../lib/opportunity-data';
import { readFile } from 'node:fs/promises';
import { opportunitiesPath } from '../../lib/dashboard-data';
import type { DashboardOpportunity } from '@tanishq/shared';
import { JobsView } from './jobs-view';

export default async function JobsPage() {
  let opportunities = await loadPersistedOpportunities();
  if (!opportunities || opportunities.length === 0) {
    try {
      const raw = JSON.parse(await readFile(opportunitiesPath, 'utf8')) as DashboardOpportunity[];
      opportunities = Array.isArray(raw) ? raw : [];
    } catch {
      opportunities = [];
    }
  }

  return (
    <main className="profile-page" style={{ maxWidth: '1180px', margin: '0 auto', padding: '38px 32px 70px' }}>
      <div className="profile-head" style={{ marginBottom: '24px' }}>
        <div>
          <Link className="back" href="/">
            ← Dashboard
          </Link>
          <p className="eyebrow accent">Opportunity Discovery</p>
          <h1>Discovered Jobs</h1>
          <p className="lead">
            Explore normalized opportunities discovered across configured ATS endpoints. Review match qualifications, identify requirement gaps, and queue roles for application.
          </p>
        </div>
        <div style={{ alignSelf: 'flex-start' }}>
          <Link href="/command-center" className="primary-button" style={{ display: 'inline-block' }}>
            Scan New Jobs <span>→</span>
          </Link>
        </div>
      </div>

      <JobsView initialOpportunities={opportunities} />
    </main>
  );
}

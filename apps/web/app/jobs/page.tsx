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
    <main className="profile-page" style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 24px 80px' }}>
      <div className="profile-head" style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Link className="back" href="/" style={{ display: 'inline-block', marginBottom: '16px', fontSize: '13px', color: 'var(--muted)' }}>
            ← Overview
          </Link>
          <h1 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.025em', margin: '0 0 6px 0', color: 'var(--ink)' }}>
            Jobs
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.5, margin: 0, maxWidth: '600px' }}>
            Opportunities discovered across configured ATS career portals. Filter by qualification match, inspect potential gaps, and prepare applications.
          </p>
        </div>
        <div style={{ alignSelf: 'flex-start' }}>
          <Link href="/command-center" className="secondary-button" style={{ display: 'inline-block' }}>
            Scan sources
          </Link>
        </div>
      </div>

      <JobsView initialOpportunities={opportunities} />
    </main>
  );
}

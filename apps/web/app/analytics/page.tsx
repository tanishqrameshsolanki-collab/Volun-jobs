import Link from 'next/link';
import { loadAnalytics } from '../../lib/analytics-data';
import type { AnalyticsBreakdown } from '@tanishq/analytics';

function RateCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="analytics-rate">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
function Breakdown({
  title,
  rows,
}: {
  title: string;
  rows: AnalyticsBreakdown[];
}) {
  return (
    <section className="breakdown">
      <div className="section-heading">
        <h2>{title}</h2>
        <span className="muted">Recorded outcomes</span>
      </div>
      {rows.length === 0 ? (
        <p className="quiet-state">No data yet.</p>
      ) : (
        <div className="breakdown-list">
          {rows.map((row) => (
            <div className="breakdown-row" key={row.key}>
              <span>{row.key}</span>
              <b>{row.total} apps</b>
              <em>{row.interviewRate}% interview</em>
              <em>{row.responseRate}% response</em>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default async function AnalyticsPage() {
  const analytics = await loadAnalytics();
  return (
    <main className="analytics-page">
      <Link className="back" href="/">
        ← Dashboard
      </Link>
      <p className="eyebrow accent">Learning loop</p>
      <h1>Analytics</h1>
      <p className="lead">
        Track which opportunities, sources, and resume variants produce
        outcomes. Rates use recorded application states only.
      </p>
      <div className="analytics-rates">
        <RateCard label="Applications" value={analytics.total} />
        <RateCard label="Response rate" value={`${analytics.responseRate}%`} />
        <RateCard label="OA rate" value={`${analytics.oaRate}%`} />
        <RateCard
          label="Interview rate"
          value={`${analytics.interviewRate}%`}
        />
        <RateCard label="Offer rate" value={`${analytics.offerRate}%`} />
      </div>
      <div className="breakdown-grid">
        <Breakdown title="By company" rows={analytics.byCompany} />
        <Breakdown title="By role category" rows={analytics.byRoleCategory} />
        <Breakdown title="By source" rows={analytics.bySource} />
        <Breakdown title="By resume variant" rows={analytics.byResumeVariant} />
        <Breakdown title="By match band" rows={analytics.byMatchBand} />
      </div>
    </main>
  );
}

import Link from 'next/link';
import { loadReviewOpportunities } from '../../lib/review-data';
import ReviewQueue from './review-queue';

export default async function ReviewPage() {
  const opportunities = await loadReviewOpportunities();
  return (
    <main className="profile-page" style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 24px 80px' }}>
      <div style={{ marginBottom: '32px' }}>
        <Link className="back" href="/" style={{ display: 'inline-block', marginBottom: '16px', fontSize: '13px', color: 'var(--muted)' }}>
          ← Overview
        </Link>
        <h1 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.025em', margin: '0 0 6px 0', color: 'var(--ink)' }}>
          Review Queue
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.5, margin: 0 }}>
          Applications prepared for submission. Nothing is submitted without your explicit decision.
        </p>
      </div>

      <ReviewQueue opportunities={opportunities} />
    </main>
  );
}

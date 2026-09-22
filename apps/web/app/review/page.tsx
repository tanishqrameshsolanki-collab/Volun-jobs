import Link from 'next/link';
import { loadReviewOpportunities } from '../../lib/review-data';
import ReviewQueue from './review-queue';

export default async function ReviewPage() {
  const opportunities = await loadReviewOpportunities();
  return (
    <main className="review-page">
      <Link className="back" href="/">
        ← Dashboard
      </Link>
      <p className="eyebrow accent">Human approval gate</p>
      <h1>Review applications</h1>
      <p className="lead">
        Nothing is submitted from this queue without your explicit decision.
        Sensitive or unresolved questions remain blocked.
      </p>
      <div className="review-banner">
        <strong>Review before approval</strong>
        <span>
          Check the score, eligibility, resume, cover letter, answers, risks,
          and missing information for each application.
        </span>
      </div>
      <ReviewQueue opportunities={opportunities} />
    </main>
  );
}

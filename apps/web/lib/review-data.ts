import type { DashboardOpportunity } from '@tanishq/shared';
import { loadDashboardSummary } from './dashboard-data';
import { loadPersistedOpportunities } from './opportunity-data';

export async function loadReviewOpportunities(): Promise<
  DashboardOpportunity[]
> {
  const fallback = (await loadDashboardSummary()).needsReview;
  const persisted = await loadPersistedOpportunities();
  if (persisted === null) return fallback;
  return persisted
    .filter(
      (opportunity) => opportunity.applicationStatus === 'READY_FOR_REVIEW',
    )
    .sort((left, right) => right.matchScore - left.matchScore);
}

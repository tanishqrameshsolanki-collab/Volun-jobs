import { describe, expect, it } from 'vitest';
import { buildDashboardSummary } from '../src/dashboard';

const opportunity = (overrides: Record<string, unknown> = {}) => ({
  id: '1',
  source: 'GREENHOUSE',
  company: 'Example',
  title: 'Software Engineer',
  matchScore: 92,
  eligibility: 'ELIGIBLE' as const,
  whyItMatches: ['Python'],
  missingRequirements: [],
  recommendedResume: 'resume_ai',
  applicationStatus: 'READY_FOR_REVIEW' as const,
  applicationUrl: 'https://example.com/job',
  discoveredAt: '2026-08-28T00:00:00.000Z',
  ...overrides,
});

describe('dashboard summary', () => {
  it('aggregates pipeline metrics and ranks recommendations', () => {
    const summary = buildDashboardSummary([
      opportunity(),
      opportunity({ id: '2', matchScore: 75, applicationStatus: 'INTERVIEW' }),
      opportunity({
        id: '3',
        matchScore: 88,
        eligibility: 'UNKNOWN',
        applicationStatus: 'DISCOVERED',
      }),
    ]);
    expect(summary).toMatchObject({
      jobsFound: 3,
      highMatch: 2,
      ready: 1,
      applied: 1,
      interviews: 1,
    });
    expect(summary.recommended.map((item) => item.id)).toEqual(['1', '3', '2']);
    expect(summary.needsReview.map((item) => item.id)).toEqual(['1', '3']);
  });

  it('does not recommend clearly ineligible jobs', () => {
    const summary = buildDashboardSummary([
      opportunity({ eligibility: 'INELIGIBLE' }),
    ]);
    expect(summary.recommended).toHaveLength(0);
  });
});

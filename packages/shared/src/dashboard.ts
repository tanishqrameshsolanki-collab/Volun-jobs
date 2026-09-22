export type DashboardEligibility =
  'ELIGIBLE' | 'LIKELY_ELIGIBLE' | 'UNKNOWN' | 'INELIGIBLE';
export type DashboardApplicationStatus =
  | 'DISCOVERED'
  | 'QUALIFIED'
  | 'TAILORING'
  | 'READY_FOR_REVIEW'
  | 'APPROVED'
  | 'APPLYING'
  | 'SUBMITTED'
  | 'OA'
  | 'INTERVIEW'
  | 'REJECTED'
  | 'OFFER'
  | 'WITHDRAWN'
  | 'SKIPPED'
  | 'MANUAL_REQUIRED'
  | 'ERROR';

export type DashboardOpportunity = {
  id: string;
  applicationId?: string;
  source: string;
  company: string;
  title: string;
  location?: string;
  matchScore: number;
  eligibility: DashboardEligibility;
  whyItMatches: string[];
  missingRequirements: string[];
  recommendedResume: string;
  applicationStatus: DashboardApplicationStatus;
  applicationUrl: string;
  discoveredAt: string;
  coverLetter?: string;
};

export type DashboardSummary = {
  jobsFound: number;
  highMatch: number;
  ready: number;
  applied: number;
  oa: number;
  interviews: number;
  offers: number;
  recommended: DashboardOpportunity[];
  needsReview: DashboardOpportunity[];
};

export function buildDashboardSummary(
  opportunities: DashboardOpportunity[],
): DashboardSummary {
  const sorted = [...opportunities].sort(
    (left, right) => right.matchScore - left.matchScore,
  );
  const appliedStatuses = new Set<DashboardApplicationStatus>([
    'APPROVED',
    'APPLYING',
    'SUBMITTED',
    'OA',
    'INTERVIEW',
    'REJECTED',
    'OFFER',
    'WITHDRAWN',
  ]);
  return {
    jobsFound: opportunities.length,
    highMatch: opportunities.filter((item) => item.matchScore >= 80).length,
    ready: opportunities.filter(
      (item) => item.applicationStatus === 'READY_FOR_REVIEW',
    ).length,
    applied: opportunities.filter((item) =>
      appliedStatuses.has(item.applicationStatus),
    ).length,
    oa: opportunities.filter((item) => item.applicationStatus === 'OA').length,
    interviews: opportunities.filter(
      (item) => item.applicationStatus === 'INTERVIEW',
    ).length,
    offers: opportunities.filter((item) => item.applicationStatus === 'OFFER')
      .length,
    recommended: sorted
      .filter(
        (item) =>
          item.eligibility !== 'INELIGIBLE' &&
          item.applicationStatus !== 'REJECTED',
      )
      .slice(0, 10),
    needsReview: sorted
      .filter(
        (item) =>
          item.eligibility === 'UNKNOWN' ||
          item.applicationStatus === 'READY_FOR_REVIEW',
      )
      .slice(0, 10),
  };
}

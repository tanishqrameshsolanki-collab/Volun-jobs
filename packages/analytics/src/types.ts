export type AnalyticsStatus =
  'SUBMITTED' | 'OA' | 'INTERVIEW' | 'REJECTED' | 'OFFER' | 'WITHDRAWN';

export type ApplicationOutcomeRecord = {
  id: string;
  company: string;
  role: string;
  industry?: string;
  source: string;
  resumeVariant?: string;
  location?: string;
  roleCategory?: string;
  matchScore?: number;
  status: AnalyticsStatus;
  appliedAt?: string;
};

export type AnalyticsRate = {
  total: number;
  responded: number;
  responseRate: number;
  oa: number;
  oaRate: number;
  interviews: number;
  interviewRate: number;
  offers: number;
  offerRate: number;
};
export type AnalyticsBreakdown = AnalyticsRate & { key: string };
export type AnalyticsSummary = AnalyticsRate & {
  byCompany: AnalyticsBreakdown[];
  byRole: AnalyticsBreakdown[];
  byIndustry: AnalyticsBreakdown[];
  bySource: AnalyticsBreakdown[];
  byResumeVariant: AnalyticsBreakdown[];
  byLocation: AnalyticsBreakdown[];
  byRoleCategory: AnalyticsBreakdown[];
  byMatchBand: AnalyticsBreakdown[];
};

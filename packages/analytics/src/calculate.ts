import type {
  AnalyticsBreakdown,
  AnalyticsRate,
  AnalyticsSummary,
  ApplicationOutcomeRecord,
} from './types';

const responseStatuses = new Set(['OA', 'INTERVIEW', 'REJECTED', 'OFFER']);
const oaStatuses = new Set(['OA', 'INTERVIEW', 'OFFER']);
const interviewStatuses = new Set(['INTERVIEW', 'OFFER']);
const appliedStatuses = new Set([
  'SUBMITTED',
  'OA',
  'INTERVIEW',
  'REJECTED',
  'OFFER',
  'WITHDRAWN',
]);
const rate = (numerator: number, denominator: number) =>
  denominator === 0 ? 0 : Math.round((numerator / denominator) * 1000) / 10;

export function calculateRate(
  records: ApplicationOutcomeRecord[],
): AnalyticsRate {
  const applied = records.filter((record) =>
    appliedStatuses.has(record.status),
  );
  return {
    total: applied.length,
    responded: applied.filter((record) => responseStatuses.has(record.status))
      .length,
    responseRate: rate(
      applied.filter((record) => responseStatuses.has(record.status)).length,
      applied.length,
    ),
    oa: applied.filter((record) => oaStatuses.has(record.status)).length,
    oaRate: rate(
      applied.filter((record) => oaStatuses.has(record.status)).length,
      applied.length,
    ),
    interviews: applied.filter((record) => interviewStatuses.has(record.status))
      .length,
    interviewRate: rate(
      applied.filter((record) => interviewStatuses.has(record.status)).length,
      applied.length,
    ),
    offers: applied.filter((record) => record.status === 'OFFER').length,
    offerRate: rate(
      applied.filter((record) => record.status === 'OFFER').length,
      applied.length,
    ),
  };
}

function breakdown(
  records: ApplicationOutcomeRecord[],
  getKey: (record: ApplicationOutcomeRecord) => string | undefined,
): AnalyticsBreakdown[] {
  const groups = new Map<string, ApplicationOutcomeRecord[]>();
  for (const record of records) {
    const key = getKey(record) ?? 'Unknown';
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }
  return [...groups.entries()]
    .map(([key, group]) => ({ key, ...calculateRate(group) }))
    .sort(
      (left, right) =>
        right.total - left.total || left.key.localeCompare(right.key),
    );
}

function matchBand(score?: number) {
  if (score === undefined) return 'Unknown';
  if (score >= 90) return '90-100';
  if (score >= 80) return '80-89';
  if (score >= 70) return '70-79';
  return '0-69';
}

export function calculateAnalytics(
  records: ApplicationOutcomeRecord[],
): AnalyticsSummary {
  return {
    ...calculateRate(records),
    byCompany: breakdown(records, (record) => record.company),
    byRole: breakdown(records, (record) => record.role),
    byIndustry: breakdown(records, (record) => record.industry),
    bySource: breakdown(records, (record) => record.source),
    byResumeVariant: breakdown(records, (record) => record.resumeVariant),
    byLocation: breakdown(records, (record) => record.location),
    byRoleCategory: breakdown(records, (record) => record.roleCategory),
    byMatchBand: breakdown(records, (record) => matchBand(record.matchScore)),
  };
}

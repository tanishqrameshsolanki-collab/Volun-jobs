import { createHash } from 'node:crypto';
import type { DiscoveredJob, DuplicateRecord, NormalizedJob } from './types';

export function normalizeText(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = '';
    for (const key of [...url.searchParams.keys()])
      if (
        key.toLowerCase().startsWith('utm_') ||
        ['source', 'ref', 'referrer', 'gh_src'].includes(key.toLowerCase())
      )
        url.searchParams.delete(key);
    return url.toString().replace(/\/$/, '');
  } catch {
    return value.trim().replace(/\/$/, '');
  }
}

export function normalizeLocation(value?: string): string | undefined {
  if (!value) return undefined;
  const location = normalizeText(value);
  return location || undefined;
}

function classifyEmploymentType(
  value?: string,
): NormalizedJob['internshipOrFullTime'] {
  const text = value?.toLowerCase() ?? '';
  if (text.includes('intern')) return 'INTERNSHIP';
  if (text.includes('full')) return 'FULL_TIME';
  if (text.includes('part')) return 'PART_TIME';
  if (text.includes('contract')) return 'CONTRACT';
  return 'UNKNOWN';
}

function stableId(company: string, title: string, url: string): string {
  return createHash('sha256')
    .update(`${company.toLowerCase()}|${title.toLowerCase()}|${url}`)
    .digest('hex')
    .slice(0, 24);
}

export function normalizeJob(job: DiscoveredJob): NormalizedJob {
  if (!job.applicationUrl || !/^https?:\/\//i.test(job.applicationUrl))
    throw new Error('Job is missing a valid application URL');
  const description = normalizeText(job.description);
  const normalizedUrl = normalizeUrl(job.applicationUrl);
  return {
    id: stableId(job.company, job.title, normalizedUrl),
    source: job.source,
    sourceJobId: job.sourceJobId,
    sourceAliases: [
      {
        source: job.source,
        sourceJobId: job.sourceJobId,
        applicationUrl: job.applicationUrl,
      },
    ],
    company: normalizeText(job.company),
    title: normalizeText(job.title),
    description,
    location: normalizeLocation(job.location),
    remotePolicy: normalizeText(job.remotePolicy ?? '') || undefined,
    employmentType: normalizeText(job.employmentType ?? '') || undefined,
    internshipOrFullTime: classifyEmploymentType(
      job.employmentType ?? job.title,
    ),
    graduationRequirements: [],
    degreeRequirements: [],
    skillsRequired: [],
    skillsPreferred: [],
    experienceRequired: undefined,
    sponsorshipInformation: undefined,
    applicationUrl: job.applicationUrl,
    normalizedUrl,
    discoveredAt: job.discoveredAt,
    rawDescription: job.description,
    raw: job.raw,
  };
}

export function deduplicateJobs(input: NormalizedJob[]): {
  jobs: NormalizedJob[];
  duplicates: DuplicateRecord[];
} {
  const jobs: NormalizedJob[] = [];
  const duplicates: DuplicateRecord[] = [];
  const byKey = new Map<string, NormalizedJob>();
  for (const candidate of input) {
    const keys = [
      `source:${candidate.source}|${candidate.sourceJobId}`,
      `url:${candidate.normalizedUrl}`,
    ];
    const existing = keys.map((key) => byKey.get(key)).find(Boolean);
    if (existing) {
      const reason: DuplicateRecord['reason'] =
        existing.source === candidate.source &&
        existing.sourceJobId === candidate.sourceJobId
          ? 'SOURCE_JOB_ID'
          : existing.normalizedUrl === candidate.normalizedUrl
            ? 'NORMALIZED_URL'
            : 'NORMALIZED_URL';
      existing.sourceAliases.push(
        ...candidate.sourceAliases.filter(
          (alias) =>
            !existing.sourceAliases.some(
              (known) =>
                known.source === alias.source &&
                known.sourceJobId === alias.sourceJobId,
            ),
        ),
      );
      duplicates.push({ duplicate: candidate, keptJobId: existing.id, reason });
      continue;
    }
    jobs.push(candidate);
    byKey.set(`url:${candidate.normalizedUrl}`, candidate);
    byKey.set(`source:${candidate.source}|${candidate.sourceJobId}`, candidate);
  }
  return { jobs, duplicates };
}

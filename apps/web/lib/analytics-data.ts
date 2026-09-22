import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  calculateAnalytics,
  type AnalyticsSummary,
  type ApplicationOutcomeRecord,
} from '@tanishq/analytics';
import { getAuthenticatedCandidate } from './opportunity-data';

const outcomeStatuses = new Set<ApplicationOutcomeRecord['status']>([
  'SUBMITTED',
  'OA',
  'INTERVIEW',
  'REJECTED',
  'OFFER',
  'WITHDRAWN',
]);

function roleCategory(title: string) {
  if (/intern|co-op|graduate/i.test(title)) return 'Internship / Graduate';
  if (/machine learning|ai|artificial intelligence|ml/i.test(title))
    return 'AI / ML';
  if (/backend|platform|infrastructure|api/i.test(title)) return 'Backend';
  if (/frontend|front-end|web|ui/i.test(title)) return 'Frontend';
  return 'Software Engineering';
}

const recordsPath = path.resolve(
  process.cwd(),
  '../../data/applications/records.json',
);

export async function loadAnalytics(): Promise<AnalyticsSummary> {
  const { supabase, user, candidateProfileId } =
    await getAuthenticatedCandidate();
  if (user && candidateProfileId) {
    const { data, error } = await supabase
      .from('applications')
      .select(
        'id,status,match_score,resume_variant,created_at,submitted_at,jobs(company,title,source,location,metadata)',
      )
      .eq('candidate_profile_id', candidateProfileId);
    if (error) throw error;
    const records = (data ?? []).flatMap((application) => {
      const jobValue = application.jobs as
        | {
            company: string;
            title: string;
            source: string;
            location: string | null;
            metadata: Record<string, unknown> | null;
          }
        | Array<{
            company: string;
            title: string;
            source: string;
            location: string | null;
            metadata: Record<string, unknown> | null;
          }>
        | null;
      const job = Array.isArray(jobValue) ? jobValue[0] : jobValue;
      if (
        !job ||
        !outcomeStatuses.has(
          application.status as ApplicationOutcomeRecord['status'],
        )
      )
        return [];
      return [
        {
          id: application.id,
          company: job.company,
          role: job.title,
          source: job.source,
          location: job.location ?? undefined,
          roleCategory: roleCategory(job.title),
          resumeVariant: application.resume_variant ?? undefined,
          matchScore: application.match_score ?? undefined,
          status: application.status as ApplicationOutcomeRecord['status'],
          appliedAt: application.submitted_at ?? application.created_at,
        },
      ];
    }) as ApplicationOutcomeRecord[];
    return calculateAnalytics(records);
  }
  const records = JSON.parse(await readFile(recordsPath, 'utf8')) as unknown;
  if (!Array.isArray(records))
    throw new Error('Application records must contain an array');
  return calculateAnalytics(records as ApplicationOutcomeRecord[]);
}

export { recordsPath };

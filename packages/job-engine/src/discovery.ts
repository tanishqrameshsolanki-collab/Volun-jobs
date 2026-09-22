import { deduplicateJobs, normalizeJob } from './normalize';
import { isoNow } from './http';
import type {
  JobSourceAdapter,
  NormalizedJob,
  SourceHealth,
  SourceHealthStatus,
  SourceMetadata,
} from './types';

export type SourceScanError = {
  code: 'SOURCE_ERROR';
  source: JobSourceAdapter['source'];
  company: string;
  endpoint: string;
  message: string;
};

export type SourceScanResult = {
  source: JobSourceAdapter['source'];
  company: string;
  jobs: NormalizedJob[];
  metadata: SourceMetadata | null;
  error?: SourceScanError;
  health: SourceHealth;
};

export type DiscoveryReport = {
  jobs: NormalizedJob[];
  duplicates: ReturnType<typeof deduplicateJobs>['duplicates'];
  sources: SourceScanResult[];
  health: SourceHealth[];
};

function classifyError(error: unknown): SourceHealthStatus {
  const message = error instanceof Error ? error.message : String(error);
  if (/\b404\b|\b410\b|not found|unknown board|unknown account/i.test(message))
    return 'INVALID_SOURCE';
  if (/\b429\b|rate.?limit|too many requests/i.test(message))
    return 'RATE_LIMITED';
  if (/malformed|parse|json|application url/i.test(message))
    return 'PARSER_ERROR';
  return 'NETWORK_ERROR';
}

function health(
  adapter: JobSourceAdapter,
  status: SourceHealthStatus,
  jobsFound: number,
  error: string | null,
): SourceHealth {
  return {
    source: adapter.source,
    company: adapter.company,
    status,
    jobs_found: jobsFound,
    last_checked: isoNow(),
    error,
  };
}

export async function discoverAll(
  adapters: JobSourceAdapter[],
): Promise<DiscoveryReport> {
  const results = await Promise.all(
    adapters.map(async (adapter): Promise<SourceScanResult> => {
      try {
        const discovered = await adapter.discoverJobs();
        let normalizationFailures = 0;
        const normalized = discovered.flatMap((job) => {
          try {
            return [normalizeJob(job)];
          } catch {
            normalizationFailures += 1;
            return [];
          }
        });
        const sourceHealth = health(
          adapter,
          discovered.length > 0 && normalized.length === 0
            ? 'PARSER_ERROR'
            : normalized.length > 0
              ? 'HEALTHY'
              : 'EMPTY',
          normalized.length,
          normalizationFailures > 0
            ? `${normalizationFailures} listing(s) could not be normalized`
            : null,
        );
        return {
          source: adapter.source,
          company: adapter.company,
          jobs: normalized,
          metadata: adapter.getSourceMetadata(),
          health: sourceHealth,
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Job source failed';
        return {
          source: adapter.source,
          company: adapter.company,
          jobs: [],
          metadata: adapter.getSourceMetadata(),
          error: {
            code: 'SOURCE_ERROR',
            source: adapter.source,
            company: adapter.company,
            endpoint: adapter.getSourceMetadata()?.endpoint ?? 'unknown',
            message,
          },
          health: health(adapter, classifyError(error), 0, message),
        };
      }
    }),
  );
  const deduplicated = deduplicateJobs(
    results.flatMap((result) => result.jobs),
  );
  return {
    jobs: deduplicated.jobs,
    duplicates: deduplicated.duplicates,
    sources: results,
    health: results.map((result) => result.health),
  };
}

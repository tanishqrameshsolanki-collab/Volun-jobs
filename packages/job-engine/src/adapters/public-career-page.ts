import { fetchText, isoNow } from '../http';
import type {
  DiscoveredJob,
  FetchLike,
  JobSourceAdapter,
  SourceMetadata,
} from '../types';

type JsonLdJob = {
  '@type'?: string | string[];
  identifier?: string | { value?: string };
  title?: string;
  description?: string;
  url?: string;
  employmentType?: string;
  jobLocation?:
    | { address?: { addressLocality?: string; addressCountry?: string } }
    | Array<{
        address?: { addressLocality?: string; addressCountry?: string };
      }>;
};

export class PublicCareerPageAdapter implements JobSourceAdapter {
  readonly source = 'PUBLIC_CAREER_PAGE' as const;
  private metadata: SourceMetadata | null = null;

  constructor(
    readonly company: string,
    private readonly jobsUrl: string,
    private readonly fetcher: FetchLike = fetch,
  ) {
    this.metadata = {
      source: this.source,
      company: this.company,
      endpoint: this.jobsUrl,
      fetchedAt: isoNow(),
      count: 0,
    };
  }

  async discoverJobs() {
    const html = await fetchText(this.fetcher, this.jobsUrl);
    const jobs = this.parseJobs(html);
    this.metadata = {
      source: this.source,
      company: this.company,
      endpoint: this.jobsUrl,
      fetchedAt: isoNow(),
      count: jobs.length,
    };
    return jobs;
  }

  async getJobDetails(sourceJobId: string) {
    const job = (await this.discoverJobs()).find(
      (candidate) => candidate.sourceJobId === sourceJobId,
    );
    if (!job)
      throw new Error(`Public career page job not found: ${sourceJobId}`);
    return job;
  }

  getApplicationUrl(job: DiscoveredJob) {
    return job.applicationUrl;
  }
  getSourceMetadata() {
    return this.metadata;
  }

  private parseJobs(html: string): DiscoveredJob[] {
    const scripts = [
      ...html.matchAll(
        /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
      ),
    ];
    const jobs: DiscoveredJob[] = [];
    for (const match of scripts) {
      try {
        const parsed = JSON.parse(match[1] ?? '') as JsonLdJob | JsonLdJob[];
        const entries = Array.isArray(parsed) ? parsed : [parsed];
        for (const entry of entries) {
          if (!this.isJobPosting(entry) || !entry.title || !entry.url) continue;
          const identifier =
            typeof entry.identifier === 'object'
              ? entry.identifier.value
              : entry.identifier;
          const location = Array.isArray(entry.jobLocation)
            ? entry.jobLocation[0]?.address
            : entry.jobLocation?.address;
          const sourceJobId = identifier ?? entry.url;
          jobs.push({
            source: this.source,
            sourceJobId,
            company: this.company,
            title: entry.title,
            description: entry.description ?? '',
            location: location
              ? [location.addressLocality, location.addressCountry]
                  .filter(Boolean)
                  .join(', ')
              : undefined,
            employmentType: entry.employmentType,
            applicationUrl: entry.url,
            discoveredAt: isoNow(),
            raw: entry,
          });
        }
      } catch {
        /* Ignore unrelated or malformed JSON-LD blocks; other blocks may still contain jobs. */
      }
    }
    return jobs;
  }

  private isJobPosting(value: JsonLdJob): boolean {
    return (
      value['@type'] === 'JobPosting' ||
      (Array.isArray(value['@type']) && value['@type'].includes('JobPosting'))
    );
  }
}

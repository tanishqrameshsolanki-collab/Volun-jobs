import { fetchJson, isoNow } from '../http';
import type {
  DiscoveredJob,
  FetchLike,
  JobSourceAdapter,
  SourceMetadata,
} from '../types';

type LeverPosting = {
  id: string;
  text: string;
  description?: string;
  descriptionPlain?: string;
  hostedUrl: string;
  applyUrl?: string;
  createdAt?: number;
  categories?: { location?: string; commitment?: string; team?: string };
  workplaceType?: string;
};
type LeverResponse = LeverPosting[];

const isLeverPosting = (value: unknown): value is LeverPosting => {
  if (!value || typeof value !== 'object') return false;
  const posting = value as Partial<LeverPosting>;
  return (
    typeof posting.id === 'string' &&
    posting.id.trim().length > 0 &&
    typeof posting.text === 'string' &&
    posting.text.trim().length > 0 &&
    typeof posting.hostedUrl === 'string' &&
    posting.hostedUrl.trim().length > 0
  );
};

export class LeverAdapter implements JobSourceAdapter {
  readonly source = 'LEVER' as const;
  private readonly endpoint: string;
  private metadata: SourceMetadata | null = null;

  constructor(
    readonly company: string,
    private readonly accountName: string,
    private readonly fetcher: FetchLike = fetch,
  ) {
    this.endpoint = `https://api.lever.co/v0/postings/${encodeURIComponent(accountName)}`;
    this.metadata = {
      source: this.source,
      company: this.company,
      endpoint: this.endpoint,
      fetchedAt: isoNow(),
      count: 0,
    };
  }

  async discoverJobs() {
    const payload = await fetchJson(this.fetcher, `${this.endpoint}?mode=json`);
    const jobs = Array.isArray(payload)
      ? (payload as LeverResponse)
          .filter(isLeverPosting)
          .map((job) => this.mapJob(job))
      : [];
    this.metadata = {
      source: this.source,
      company: this.company,
      endpoint: this.endpoint,
      fetchedAt: isoNow(),
      count: jobs.length,
    };
    return jobs;
  }

  async getJobDetails(sourceJobId: string) {
    const payload = await fetchJson(
      this.fetcher,
      `${this.endpoint}/${encodeURIComponent(sourceJobId)}`,
    );
    if (!isLeverPosting(payload))
      throw new Error(`Lever returned a malformed job: ${sourceJobId}`);
    const job = payload;
    return this.mapJob(job);
  }

  getApplicationUrl(job: DiscoveredJob) {
    return job.applicationUrl;
  }
  getSourceMetadata() {
    return this.metadata;
  }

  private mapJob(job: LeverPosting): DiscoveredJob {
    return {
      source: this.source,
      sourceJobId: job.id,
      company: this.company,
      title: job.text,
      description: job.descriptionPlain ?? job.description ?? '',
      location: job.categories?.location,
      remotePolicy: job.workplaceType,
      employmentType: job.categories?.commitment,
      applicationUrl: job.applyUrl ?? job.hostedUrl,
      discoveredAt: job.createdAt
        ? new Date(job.createdAt).toISOString()
        : isoNow(),
      raw: job,
    };
  }
}

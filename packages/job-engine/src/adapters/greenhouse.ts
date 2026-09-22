import { fetchJson, isoNow } from '../http';
import type {
  DiscoveredJob,
  FetchLike,
  JobSourceAdapter,
  SourceMetadata,
} from '../types';

type GreenhouseJob = {
  id: number;
  title: string;
  content?: string;
  absolute_url: string;
  updated_at?: string;
  location?: { name?: string };
  metadata?: unknown[];
};
type GreenhouseResponse = { jobs?: GreenhouseJob[] };

const isGreenhouseJob = (value: unknown): value is GreenhouseJob => {
  if (!value || typeof value !== 'object') return false;
  const job = value as Partial<GreenhouseJob>;
  return (
    typeof job.id === 'number' &&
    Number.isFinite(job.id) &&
    typeof job.title === 'string' &&
    job.title.trim().length > 0 &&
    typeof job.absolute_url === 'string' &&
    job.absolute_url.trim().length > 0
  );
};

export class GreenhouseAdapter implements JobSourceAdapter {
  readonly source = 'GREENHOUSE' as const;
  private readonly endpoint: string;
  private metadata: SourceMetadata | null = null;

  constructor(
    readonly company: string,
    private readonly boardToken: string,
    private readonly fetcher: FetchLike = fetch,
  ) {
    this.endpoint = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs`;
    this.metadata = {
      source: this.source,
      company: this.company,
      endpoint: this.endpoint,
      fetchedAt: isoNow(),
      count: 0,
    };
  }

  async discoverJobs() {
    const payload = await fetchJson(
      this.fetcher,
      `${this.endpoint}?content=true`,
    );
    const sourceJobs =
      payload &&
      typeof payload === 'object' &&
      Array.isArray((payload as GreenhouseResponse).jobs)
        ? ((payload as GreenhouseResponse).jobs ?? [])
        : [];
    const jobs = sourceJobs
      .filter(isGreenhouseJob)
      .map((job) => this.mapJob(job));
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
      `${this.endpoint}/${encodeURIComponent(sourceJobId)}?content=true`,
    );
    if (!isGreenhouseJob(payload))
      throw new Error(`Greenhouse returned a malformed job: ${sourceJobId}`);
    const job = payload;
    return this.mapJob(job);
  }

  getApplicationUrl(job: DiscoveredJob) {
    return job.applicationUrl;
  }
  getSourceMetadata() {
    return this.metadata;
  }

  private mapJob(job: GreenhouseJob): DiscoveredJob {
    return {
      source: this.source,
      sourceJobId: String(job.id),
      company: this.company,
      title: job.title,
      description: job.content ?? '',
      location: job.location?.name,
      applicationUrl: job.absolute_url,
      discoveredAt: job.updated_at ?? isoNow(),
      raw: job,
    };
  }
}

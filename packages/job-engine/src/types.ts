export type JobSource = 'GREENHOUSE' | 'LEVER' | 'PUBLIC_CAREER_PAGE';

export type EligibilityStatus =
  'ELIGIBLE' | 'LIKELY_ELIGIBLE' | 'UNKNOWN' | 'INELIGIBLE';

export type DiscoveredJob = {
  source: JobSource;
  sourceJobId: string;
  company: string;
  title: string;
  description: string;
  location?: string;
  remotePolicy?: string;
  employmentType?: string;
  applicationUrl: string;
  discoveredAt: string;
  raw: unknown;
};

export type NormalizedJob = {
  id: string;
  source: JobSource;
  sourceJobId: string;
  sourceAliases: Array<{
    source: JobSource;
    sourceJobId: string;
    applicationUrl: string;
  }>;
  company: string;
  title: string;
  description: string;
  location?: string;
  remotePolicy?: string;
  employmentType?: string;
  internshipOrFullTime?:
    'INTERNSHIP' | 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'UNKNOWN';
  salary?: string;
  graduationRequirements: string[];
  degreeRequirements: string[];
  skillsRequired: string[];
  skillsPreferred: string[];
  experienceRequired?: string;
  sponsorshipInformation?: string;
  applicationUrl: string;
  normalizedUrl: string;
  discoveredAt: string;
  deadline?: string;
  rawDescription: string;
  raw: unknown;
};

export type DuplicateReason = 'SOURCE_JOB_ID' | 'NORMALIZED_URL';

export type SourceHealthStatus =
  | 'HEALTHY'
  | 'EMPTY'
  | 'INVALID_SOURCE'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'PARSER_ERROR';

export type SourceHealth = {
  source: JobSource;
  company: string;
  status: SourceHealthStatus;
  jobs_found: number;
  last_checked: string;
  error: string | null;
};

export type DuplicateRecord = {
  duplicate: NormalizedJob;
  keptJobId: string;
  reason: DuplicateReason;
};

export type SourceMetadata = {
  source: JobSource;
  company: string;
  endpoint: string;
  fetchedAt: string;
  count: number;
};

export type JobSourceAdapter = {
  readonly source: JobSource;
  readonly company: string;
  discoverJobs(): Promise<DiscoveredJob[]>;
  getJobDetails(sourceJobId: string): Promise<DiscoveredJob>;
  getApplicationUrl(job: DiscoveredJob): string;
  getSourceMetadata(): SourceMetadata | null;
};

export type FetchResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  json(): Promise<unknown>;
  text(): Promise<string>;
};

export type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<FetchResponse>;

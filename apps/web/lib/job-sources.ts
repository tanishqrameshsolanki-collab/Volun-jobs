import {
  GreenhouseAdapter,
  JobSourceRegistry,
  LeverAdapter,
  PublicCareerPageAdapter,
} from '@tanishq/job-engine';

type SourceConfig =
  | { type: 'GREENHOUSE'; company: string; boardToken: string }
  | { type: 'LEVER'; company: string; accountName: string }
  | { type: 'PUBLIC_CAREER_PAGE'; company: string; jobsUrl: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function parseSourceConfig(value: unknown): SourceConfig[] {
  if (!Array.isArray(value))
    throw new Error('JOB_SOURCE_CONFIG must be a JSON array');
  return value.map((item, index) => {
    if (
      !isRecord(item) ||
      typeof item.type !== 'string' ||
      typeof item.company !== 'string'
    )
      throw new Error(`JOB_SOURCE_CONFIG item ${index + 1} is invalid`);
    if (item.type === 'GREENHOUSE' && typeof item.boardToken === 'string')
      return {
        type: item.type,
        company: item.company,
        boardToken: item.boardToken,
      };
    if (item.type === 'LEVER' && typeof item.accountName === 'string')
      return {
        type: item.type,
        company: item.company,
        accountName: item.accountName,
      };
    if (item.type === 'PUBLIC_CAREER_PAGE' && typeof item.jobsUrl === 'string')
      return { type: item.type, company: item.company, jobsUrl: item.jobsUrl };
    throw new Error(
      `JOB_SOURCE_CONFIG item ${index + 1} has unsupported fields`,
    );
  });
}

export function createConfiguredJobRegistry() {
  const raw = process.env.JOB_SOURCE_CONFIG ?? '[]';
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('JOB_SOURCE_CONFIG must contain valid JSON');
  }

  const registry = new JobSourceRegistry();
  for (const config of parseSourceConfig(parsed)) {
    if (config.type === 'GREENHOUSE')
      registry.register(
        new GreenhouseAdapter(config.company, config.boardToken),
      );
    if (config.type === 'LEVER')
      registry.register(new LeverAdapter(config.company, config.accountName));
    if (config.type === 'PUBLIC_CAREER_PAGE')
      registry.register(
        new PublicCareerPageAdapter(config.company, config.jobsUrl),
      );
  }
  return registry;
}

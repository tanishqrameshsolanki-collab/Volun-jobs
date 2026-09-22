import { describe, expect, it } from 'vitest';
import { GreenhouseAdapter } from '../src/adapters/greenhouse';
import { LeverAdapter } from '../src/adapters/lever';
import { normalizeJob } from '../src/normalize';
import type { JobSourceAdapter } from '../src/types';

const sources: Array<{
  company: string;
  adapter: JobSourceAdapter;
}> = [
  {
    company: 'Anthropic',
    adapter: new GreenhouseAdapter('Anthropic', 'anthropic'),
  },
  {
    company: 'Databricks',
    adapter: new GreenhouseAdapter('Databricks', 'databricks'),
  },
  { company: 'Cialfo', adapter: new GreenhouseAdapter('Cialfo', 'cialfo') },
  { company: 'Zocdoc', adapter: new GreenhouseAdapter('Zocdoc', 'zocdoc') },
  {
    company: 'Dun & Bradstreet',
    adapter: new LeverAdapter('Dun & Bradstreet', 'dnb'),
  },
  {
    company: 'Wing Assistant',
    adapter: new LeverAdapter('Wing Assistant', 'getwingapp'),
  },
  { company: 'Mactores', adapter: new LeverAdapter('Mactores', 'mactores') },
  { company: 'Xsolla', adapter: new LeverAdapter('Xsolla', 'xsolla') },
  { company: 'Weekday', adapter: new LeverAdapter('Weekday', 'weekdayworks') },
];

describe.skipIf(process.env.LIVE_SOURCE_TESTS !== '1')(
  'live curated job sources',
  () => {
    it.each(sources)(
      '$company exposes real normalizable listings',
      async ({ company, adapter }) => {
        const jobs = await adapter.discoverJobs();
        expect(jobs.length).toBeGreaterThan(0);
        const first = jobs[0];
        expect(first?.company).toBe(company);
        expect(first?.title).toBeTruthy();
        expect(first?.applicationUrl).toMatch(/^https?:\/\//);
        expect(first?.location || first?.remotePolicy).toBeTruthy();
        const normalized = normalizeJob(first!);
        expect(normalized.company).toBe(company);
        expect(normalized.title).toBeTruthy();
        expect(normalized.normalizedUrl).toMatch(/^https?:\/\//);
        expect(normalized.location || normalized.remotePolicy).toBeTruthy();
      },
      20_000,
    );
  },
);

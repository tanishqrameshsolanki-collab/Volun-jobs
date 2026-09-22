import { describe, expect, it } from 'vitest';
import { discoverAll } from '../src/discovery';
import type { JobSourceAdapter } from '../src/types';

const adapter = (
  company: string,
  jobs: Awaited<ReturnType<JobSourceAdapter['discoverJobs']>>,
  failure?: string,
  source: JobSourceAdapter['source'] = 'PUBLIC_CAREER_PAGE',
): JobSourceAdapter => ({
  source,
  company,
  discoverJobs: async () => {
    if (failure) throw new Error(failure);
    return jobs;
  },
  getJobDetails: async () => jobs[0]!,
  getApplicationUrl: (job) => job.applicationUrl,
  getSourceMetadata: () => ({
    source: 'PUBLIC_CAREER_PAGE',
    company,
    endpoint: `https://example.com/${company}`,
    fetchedAt: '2026-08-28T00:00:00.000Z',
    count: jobs.length,
  }),
});

describe('resilient discovery orchestration', () => {
  it('continues when one source fails and reports SOURCE_ERROR', async () => {
    const report = await discoverAll([
      adapter('Good', [
        {
          source: 'PUBLIC_CAREER_PAGE',
          sourceJobId: '1',
          company: 'Good',
          title: 'Frontend Intern',
          description: 'React',
          applicationUrl: 'https://example.com/1',
          discoveredAt: '2026-08-28T00:00:00.000Z',
          raw: {},
        },
      ]),
      {
        ...adapter('Broken', [], '429 Too Many Requests'),
        getSourceMetadata: () => ({
          source: 'PUBLIC_CAREER_PAGE',
          company: 'Broken',
          endpoint: 'https://broken.example/careers',
          fetchedAt: '2026-08-28T00:00:00.000Z',
          count: 0,
        }),
      },
    ]);
    expect(report.jobs).toHaveLength(1);
    expect(
      report.sources.find((source) => source.company === 'Broken')?.error,
    ).toMatchObject({
      code: 'SOURCE_ERROR',
      endpoint: 'https://broken.example/careers',
      message: '429 Too Many Requests',
    });
    expect(report.health).toMatchObject([
      { company: 'Good', status: 'HEALTHY', jobs_found: 1 },
      { company: 'Broken', status: 'RATE_LIMITED', jobs_found: 0 },
    ]);
  });

  it('reports empty and parser-error sources without stopping the scan', async () => {
    const empty = adapter('Empty', []);
    const malformed = adapter('Malformed', [
      {
        source: 'PUBLIC_CAREER_PAGE',
        sourceJobId: 'bad',
        company: 'Malformed',
        title: 'Missing URL',
        description: '',
        applicationUrl: '',
        discoveredAt: '2026-08-28T00:00:00.000Z',
        raw: {},
      },
    ]);
    const report = await discoverAll([empty, malformed]);
    expect(report.health).toMatchObject([
      { company: 'Empty', status: 'EMPTY', jobs_found: 0 },
      { company: 'Malformed', status: 'PARSER_ERROR', jobs_found: 0 },
    ]);
  });

  it('marks invalid Greenhouse and Lever identifiers without aborting other sources', async () => {
    const report = await discoverAll([
      adapter('Bad Greenhouse', [], '404 Not Found', 'GREENHOUSE'),
      adapter('Bad Lever', [], '404 Not Found', 'LEVER'),
      adapter('Good Source', [
        {
          source: 'PUBLIC_CAREER_PAGE',
          sourceJobId: '1',
          company: 'Good Source',
          title: 'Backend Engineer',
          description: 'Build APIs',
          applicationUrl: 'https://example.com/jobs/1',
          discoveredAt: '2026-08-28T00:00:00.000Z',
          raw: {},
        },
      ]),
    ]);
    expect(report.health).toMatchObject([
      { company: 'Bad Greenhouse', status: 'INVALID_SOURCE' },
      { company: 'Bad Lever', status: 'INVALID_SOURCE' },
      { company: 'Good Source', status: 'HEALTHY' },
    ]);
    expect(report.jobs).toHaveLength(1);
  });

  it('classifies network failures separately from invalid boards', async () => {
    const report = await discoverAll([
      adapter('Offline', [], 'fetch failed', 'GREENHOUSE'),
    ]);
    expect(report.health[0]).toMatchObject({
      company: 'Offline',
      status: 'NETWORK_ERROR',
    });
  });
});

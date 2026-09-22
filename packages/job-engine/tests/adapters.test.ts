import { describe, expect, it } from 'vitest';
import { GreenhouseAdapter } from '../src/adapters/greenhouse';
import { LeverAdapter } from '../src/adapters/lever';
import { PublicCareerPageAdapter } from '../src/adapters/public-career-page';
import { JobSourceRegistry } from '../src/registry';
import type { FetchLike, FetchResponse } from '../src/types';

const response = (body: unknown): FetchResponse => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: async () => body,
  text: async () => String(body),
});
const fetchMock =
  (body: unknown): FetchLike =>
  async () =>
    response(body);

describe('job discovery adapters', () => {
  it('discovers and maps Greenhouse postings with source metadata', async () => {
    const adapter = new GreenhouseAdapter(
      'Example',
      'example',
      fetchMock({
        jobs: [
          {
            id: 42,
            title: 'Software Engineering Intern',
            content: '<p>Build systems</p>',
            absolute_url: 'https://boards.greenhouse.io/example/jobs/42',
            location: { name: 'Mumbai, India' },
          },
        ],
      }),
    );
    const jobs = await adapter.discoverJobs();
    expect(jobs[0]).toMatchObject({
      source: 'GREENHOUSE',
      sourceJobId: '42',
      title: 'Software Engineering Intern',
      location: 'Mumbai, India',
    });
    expect(adapter.getSourceMetadata()).toMatchObject({
      company: 'Example',
      count: 1,
    });
  });

  it('discovers and maps Lever postings', async () => {
    const adapter = new LeverAdapter(
      'Example',
      'example',
      fetchMock([
        {
          id: 'abc',
          text: 'AI Intern',
          descriptionPlain: 'Work on models',
          hostedUrl: 'https://jobs.lever.co/example/abc',
          categories: { location: 'Remote', commitment: 'Internship' },
        },
      ]),
    );
    const jobs = await adapter.discoverJobs();
    expect(jobs[0]).toMatchObject({
      source: 'LEVER',
      sourceJobId: 'abc',
      title: 'AI Intern',
      location: 'Remote',
      employmentType: 'Internship',
    });
  });

  it('extracts public JobPosting JSON-LD and ignores unrelated blocks', async () => {
    const html =
      '<script type="application/ld+json">{"@type":"WebSite","name":"Example"}</script><script type="application/ld+json">{"@type":"JobPosting","identifier":"job-7","title":"Graphics Intern","description":"WebGL","url":"https://example.com/jobs/7","jobLocation":{"address":{"addressLocality":"Mumbai","addressCountry":"IN"}}}</script>';
    const adapter = new PublicCareerPageAdapter(
      'Example',
      'https://example.com/careers',
      fetchMock(html),
    );
    await expect(adapter.discoverJobs()).resolves.toMatchObject([
      {
        sourceJobId: 'job-7',
        title: 'Graphics Intern',
        location: 'Mumbai, IN',
      },
    ]);
  });

  it('prevents duplicate adapter registration', () => {
    const registry = new JobSourceRegistry();
    const adapter = new GreenhouseAdapter(
      'Example',
      'example',
      fetchMock({ jobs: [] }),
    );
    registry.register(adapter);
    expect(() => registry.register(adapter)).toThrow('already registered');
  });

  it('surfaces upstream errors without hiding the endpoint', async () => {
    const failingFetcher: FetchLike = async () => ({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      json: async () => ({}),
      text: async () => '',
    });
    await expect(
      new LeverAdapter('Example', 'example', failingFetcher).discoverJobs(),
    ).rejects.toThrow('429 Too Many Requests');
  });

  it('skips malformed source records without crashing the source run', async () => {
    await expect(
      new GreenhouseAdapter(
        'Example',
        'example',
        fetchMock({
          jobs: [
            { id: 'bad' },
            {
              id: 7,
              title: 'Valid role',
              absolute_url: 'https://example.com/7',
            },
          ],
        }),
      ).discoverJobs(),
    ).resolves.toMatchObject([{ sourceJobId: '7', title: 'Valid role' }]);
    await expect(
      new LeverAdapter(
        'Example',
        'example',
        fetchMock({ not: 'an array' }),
      ).discoverJobs(),
    ).resolves.toEqual([]);
  });
});

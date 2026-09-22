import { describe, expect, it } from 'vitest';
import {
  deduplicateJobs,
  normalizeJob,
  normalizeText,
  normalizeUrl,
} from '../src/normalize';
import type { DiscoveredJob } from '../src/types';

const discovered = (overrides: Partial<DiscoveredJob> = {}): DiscoveredJob => ({
  source: 'GREENHOUSE',
  sourceJobId: '1',
  company: 'Example, Inc.',
  title: 'Software Engineering Intern',
  description: '<p>Build &amp; ship.</p>\n',
  applicationUrl: 'https://example.com/jobs/1?utm_source=feed',
  discoveredAt: '2026-08-28T00:00:00.000Z',
  raw: {},
  ...overrides,
});

describe('job normalization', () => {
  it('strips markup, decodes common entities, and collapses whitespace', () => {
    expect(normalizeText('<p>Build&nbsp; &amp; ship</p>')).toBe('Build & ship');
  });

  it('canonicalizes URLs without removing meaningful query parameters', () => {
    expect(
      normalizeUrl(
        'https://Example.com/jobs/1?utm_source=feed&gh_src=abc&lang=en#apply',
      ),
    ).toBe('https://example.com/jobs/1?lang=en');
  });

  it('creates a stable canonical record and classifies internship roles', () => {
    const job = normalizeJob(discovered());
    expect(job).toMatchObject({
      company: 'Example, Inc.',
      title: 'Software Engineering Intern',
      description: 'Build & ship.',
      normalizedUrl: 'https://example.com/jobs/1',
      internshipOrFullTime: 'INTERNSHIP',
    });
    expect(job.id).toHaveLength(24);
  });

  it('deduplicates the same job across sources while preserving aliases', () => {
    const first = normalizeJob(discovered());
    const second = normalizeJob(
      discovered({
        source: 'LEVER',
        sourceJobId: 'lever-9',
        applicationUrl: 'https://example.com/jobs/1?ref=partner',
      }),
    );
    const result = deduplicateJobs([first, second]);
    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0]?.sourceAliases).toHaveLength(2);
    expect(result.duplicates[0]?.reason).toBe('NORMALIZED_URL');
  });

  it('keeps distinct postings when only company and title match', () => {
    const first = normalizeJob(discovered());
    const second = normalizeJob(
      discovered({
        sourceJobId: '2',
        applicationUrl: 'https://example.com/jobs/2',
      }),
    );
    expect(deduplicateJobs([first, second]).jobs).toHaveLength(2);
  });

  it('rejects postings without an application URL', () => {
    expect(() => normalizeJob(discovered({ applicationUrl: '' }))).toThrow(
      'valid application URL',
    );
  });
});

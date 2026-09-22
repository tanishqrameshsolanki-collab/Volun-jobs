import { describe, expect, it } from 'vitest';
import profile from '../../../data/candidate/profile.json';
import { evaluateEligibility } from '@tanishq/job-engine';
import { normalizeJob } from '@tanishq/job-engine';
import { scoreCacheKey, scoreJob, scoreJobDeterministically } from '../src';
import type { CandidateProfile } from '@tanishq/shared';
import type { JobScore, StructuredAiProvider } from '../src/types';

const candidate = profile as CandidateProfile;
const baseJob = normalizeJob({
  source: 'GREENHOUSE',
  sourceJobId: '42',
  company: 'Example',
  title: 'AI Software Engineering Intern',
  description:
    'Build Python and React systems with vector embeddings and LLM tooling.',
  applicationUrl: 'https://example.com/jobs/42',
  discoveredAt: '2026-08-28T00:00:00.000Z',
  raw: {},
});
const request = {
  job: baseJob,
  candidate,
  eligibility: evaluateEligibility(baseJob, candidate, {
    evaluatedAt: new Date('2026-08-28'),
  }),
};

const validScore: JobScore = {
  score: 88,
  recommendation: 'APPLY',
  technicalFit: 90,
  experienceFit: 80,
  projectFit: 90,
  eligibilityFit: 55,
  roleFit: 80,
  locationFit: 100,
  companyQualityFit: 50,
  strengths: ['Python'],
  missingRequirements: [],
  risks: ['Authorization unknown'],
  recommendedResume: 'resume_ai',
  recommendedProjects: ['DAWN'],
  explanation: 'Strong AI and full-stack evidence.',
};

describe('AI scoring boundary', () => {
  it('produces an explainable deterministic score without an API key', () => {
    const result = scoreJobDeterministically(
      baseJob,
      candidate,
      request.eligibility,
    );
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.recommendedResume).toBe('resume_ai');
    expect(result.explanation).toContain('technical overlap');
  });

  it('applies a hard cap to clearly ineligible roles', () => {
    const ineligibleJob = { ...baseJob, deadline: '2026-01-01T00:00:00.000Z' };
    const eligibility = evaluateEligibility(ineligibleJob, candidate, {
      evaluatedAt: new Date('2026-08-28'),
    });
    expect(
      scoreJobDeterministically(ineligibleJob, candidate, eligibility).score,
    ).toBeLessThanOrEqual(20);
  });

  it('caches deterministic results by job, candidate, and prompt version', async () => {
    const cache = new (await import('../src/cache')).MemoryScoreCache();
    const first = await scoreJob(request, { cache });
    const second = await scoreJob(request, { cache });
    expect(first.status).toBe('READY');
    expect(second.status).toBe('READY');
    expect(first.cacheKey).toBe(scoreCacheKey(request, 'JOB_SCORING_V1'));
  });

  it('accepts valid provider output and retries invalid output once', async () => {
    let calls = 0;
    const provider: StructuredAiProvider = {
      generateJobScore: async () => {
        calls += 1;
        return calls === 1 ? { invalid: true } : validScore;
      },
    };
    const result = await scoreJob(request, { provider });
    expect(result.status).toBe('READY');
    expect(calls).toBe(2);
  });

  it('routes repeated invalid provider output to manual review', async () => {
    const provider: StructuredAiProvider = {
      generateJobScore: async () => ({ invalid: true }),
    };
    const result = await scoreJob(request, { provider });
    expect(result.status).toBe('MANUAL_REVIEW');
    if (result.status === 'MANUAL_REVIEW')
      expect(result.fallback).toBeDefined();
  });

  it('routes hallucinated projects to manual review', async () => {
    const provider: StructuredAiProvider = {
      generateJobScore: async () => ({
        ...validScore,
        recommendedProjects: ['Invented Project'],
      }),
    };
    const result = await scoreJob(request, { provider });
    expect(result.status).toBe('MANUAL_REVIEW');
  });
});

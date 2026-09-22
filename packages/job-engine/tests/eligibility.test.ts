import { describe, expect, it } from 'vitest';
import profile from '../../../data/candidate/profile.json';
import { evaluateEligibility } from '../src/eligibility';
import { normalizeJob } from '../src/normalize';
import type { CandidateProfile } from '@tanishq/shared';
import type { DiscoveredJob } from '../src/types';

const candidate = profile as CandidateProfile;
const job = (overrides: Partial<DiscoveredJob> = {}) =>
  normalizeJob({
    source: 'GREENHOUSE',
    sourceJobId: '1',
    company: 'Example',
    title: 'Software Engineering Intern',
    description: '',
    applicationUrl: 'https://example.com/jobs/1',
    discoveredAt: '2026-08-28T00:00:00.000Z',
    raw: {},
    ...overrides,
  });

describe('eligibility evaluation', () => {
  it('treats an unstated authorization requirement as non-blocking', () => {
    const result = evaluateEligibility(job(), candidate, {
      evaluatedAt: new Date('2026-08-28'),
    });
    expect(result.status).toBe('ELIGIBLE');
    expect(
      result.checks.find((check) => check.name === 'authorization')?.status,
    ).toBe('PASS');
  });

  it('marks a past deadline as a hard blocker', () => {
    const result = evaluateEligibility(
      { ...job(), deadline: '2026-08-01T00:00:00.000Z' },
      candidate,
      { evaluatedAt: new Date('2026-08-28') },
    );
    expect(result.status).toBe('INELIGIBLE');
    expect(result.blockers).toContain('Application deadline has passed');
  });

  it('rejects a conflicting graduation year', () => {
    const result = evaluateEligibility(
      {
        ...job(),
        graduationRequirements: ['Expected graduation in 2026 or earlier'],
      },
      candidate,
      { evaluatedAt: new Date('2026-08-28') },
    );
    expect(result.status).toBe('INELIGIBLE');
    expect(
      result.checks.find((check) => check.name === 'graduation')?.status,
    ).toBe('FAIL');
  });

  it('accepts an internship with a technical or related-field degree requirement', () => {
    const result = evaluateEligibility(
      {
        ...job(),
        degreeRequirements: [
          "Bachelor's degree in Computer Science or related technical field",
        ],
      },
      candidate,
      { evaluatedAt: new Date('2026-08-28') },
    );
    expect(result.checks.find((check) => check.name === 'degree')?.status).toBe(
      'PASS',
    );
  });

  it('keeps ambiguous degree requirements human-reviewable', () => {
    const result = evaluateEligibility(
      {
        ...job(),
        degreeRequirements: ["Bachelor's degree in Computer Science"],
      },
      candidate,
      { evaluatedAt: new Date('2026-08-28') },
    );
    expect(result.checks.find((check) => check.name === 'degree')?.status).toBe(
      'UNKNOWN',
    );
  });

  it('recognizes non-critical location uncertainty as likely eligible', () => {
    const result = evaluateEligibility(
      job({ location: 'Bengaluru, India' }),
      candidate,
      { evaluatedAt: new Date('2026-08-28') },
    );
    expect(result.status).toBe('LIKELY_ELIGIBLE');
  });

  it('rejects a graduation requirement expressed as a cutoff year', () => {
    const cutoffJob = {
      ...job(),
      graduationRequirements: ['Must graduate by 2026'],
    };
    const result = evaluateEligibility(cutoffJob, candidate, {
      evaluatedAt: new Date('2026-08-28'),
    });
    expect(result.status).toBe('INELIGIBLE');
  });

  it('accepts Mumbai on-site or hybrid roles for candidate', () => {
    const result = evaluateEligibility(
      job({ location: 'Mumbai, Maharashtra, India' }),
      candidate,
      { evaluatedAt: new Date('2026-08-28') },
    );
    expect(result.checks.find((c) => c.name === 'location')?.status).toBe('PASS');
    expect(result.status).toBe('ELIGIBLE');
  });

  it('accepts worldwide remote roles', () => {
    const result = evaluateEligibility(
      job({ location: 'Remote, Worldwide' }),
      candidate,
      { evaluatedAt: new Date('2026-08-28') },
    );
    expect(result.checks.find((c) => c.name === 'location')?.status).toBe('PASS');
    expect(result.status).toBe('ELIGIBLE');
  });

  it('rejects foreign-restricted remote roles (e.g. Remote - US Only)', () => {
    const result = evaluateEligibility(
      job({ location: 'Remote, United States' }),
      candidate,
      { evaluatedAt: new Date('2026-08-28') },
    );
    expect(result.status).toBe('INELIGIBLE');
    expect(result.checks.find((c) => c.name === 'location')?.status).toBe('FAIL');
  });

  it('rejects foreign on-site roles', () => {
    const result = evaluateEligibility(
      job({ location: 'San Francisco, California' }),
      candidate,
      { evaluatedAt: new Date('2026-08-28') },
    );
    expect(result.status).toBe('INELIGIBLE');
    expect(result.checks.find((c) => c.name === 'location')?.status).toBe('FAIL');
  });

  it('rejects executive and staff/principal roles', () => {
    const result = evaluateEligibility(
      job({ title: 'Staff Software Engineer' }),
      candidate,
      { evaluatedAt: new Date('2026-08-28') },
    );
    expect(result.status).toBe('INELIGIBLE');
    expect(result.checks.find((c) => c.name === 'seniority')?.status).toBe('FAIL');
  });
});

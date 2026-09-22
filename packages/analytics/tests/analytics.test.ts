import { describe, expect, it } from 'vitest';
import {
  calculateAnalytics,
  calculateRate,
  type ApplicationOutcomeRecord,
} from '../src';

const records: ApplicationOutcomeRecord[] = [
  {
    id: '1',
    company: 'Alpha',
    role: 'AI Intern',
    industry: 'AI',
    source: 'GREENHOUSE',
    resumeVariant: 'resume_ai',
    location: 'Mumbai',
    roleCategory: 'AI / ML',
    matchScore: 94,
    status: 'INTERVIEW',
  },
  {
    id: '2',
    company: 'Alpha',
    role: 'Frontend Intern',
    industry: 'SaaS',
    source: 'LEVER',
    resumeVariant: 'resume_fullstack',
    location: 'Remote',
    roleCategory: 'Frontend',
    matchScore: 76,
    status: 'REJECTED',
  },
  {
    id: '3',
    company: 'Beta',
    role: 'Graphics Intern',
    industry: 'Creative Tech',
    source: 'GREENHOUSE',
    resumeVariant: 'resume_graphics',
    location: 'Mumbai',
    roleCategory: 'Graphics',
    matchScore: 88,
    status: 'OFFER',
  },
  {
    id: '4',
    company: 'Beta',
    role: 'Backend Intern',
    industry: 'AI',
    source: 'GREENHOUSE',
    resumeVariant: 'resume_backend',
    location: 'Mumbai',
    roleCategory: 'Backend',
    matchScore: 68,
    status: 'SUBMITTED',
  },
];

describe('analytics', () => {
  it('calculates funnel rates from recorded statuses', () => {
    expect(calculateRate(records)).toMatchObject({
      total: 4,
      responded: 3,
      responseRate: 75,
      oa: 2,
      interviews: 2,
      offers: 1,
      offerRate: 25,
    });
  });

  it('creates transparent grouped breakdowns', () => {
    const summary = calculateAnalytics(records);
    expect(summary.byCompany.map((item) => item.key)).toEqual([
      'Alpha',
      'Beta',
    ]);
    expect(
      summary.byCompany.find((item) => item.key === 'Alpha'),
    ).toMatchObject({ total: 2, responded: 2, responseRate: 100 });
    expect(
      summary.byRoleCategory.find((item) => item.key === 'AI / ML')
        ?.interviewRate,
    ).toBe(100);
    expect(summary.byMatchBand.map((item) => item.key)).toEqual([
      '0-69',
      '70-79',
      '80-89',
      '90-100',
    ]);
  });

  it('returns zero rates for an empty dataset', () => {
    expect(calculateAnalytics([])).toMatchObject({
      total: 0,
      responseRate: 0,
      offerRate: 0,
    });
  });
});

import { describe, expect, it } from 'vitest';
import profile from '../../../data/candidate/profile.json';
import { normalizeJob } from '@tanishq/job-engine';
import type { CandidateProfile } from '@tanishq/shared';
import { buildNarrativeDraft, buildSafeAnswer, classifyQuestion } from '../src';

const candidate = profile as CandidateProfile;
const job = normalizeJob({
  source: 'GREENHOUSE',
  sourceJobId: '1',
  company: 'Example',
  title: 'AI Intern',
  description: 'LLM role',
  applicationUrl: 'https://example.com/1',
  discoveredAt: '2026-08-28T00:00:00.000Z',
  raw: {},
});

describe('application question engine', () => {
  it('classifies safe profile fields', () => {
    expect(classifyQuestion({ id: 'email', label: 'Email address' }).type).toBe(
      'SAFE_AUTO_FILL',
    );
    expect(
      buildSafeAnswer(
        { id: 'graduation_year', label: 'Expected graduation year' },
        candidate,
      ),
    ).toMatchObject({
      type: 'SAFE_AUTO_FILL',
      answer: '2029',
      status: 'READY_TO_FILL',
    });
  });

  it('auto-fills verified professional links and flags missing ones', () => {
    expect(
      buildSafeAnswer({ id: 'linkedin', label: 'LinkedIn URL' }, candidate),
    ).toMatchObject({
      status: 'READY_TO_FILL',
      type: 'SAFE_AUTO_FILL',
      answer: 'https://www.linkedin.com/in/tanishq-sol/',
    });

    const withoutLinks = { ...candidate, links: [] };
    expect(
      buildSafeAnswer({ id: 'linkedin', label: 'LinkedIn URL' }, withoutLinks),
    ).toMatchObject({ status: 'ANSWER_REQUIRED', type: 'SAFE_AUTO_FILL' });
  });

  it('stops on sensitive questions', () => {
    const result = buildSafeAnswer(
      {
        id: 'sponsorship',
        label: 'Will you now or in the future require sponsorship?',
      },
      candidate,
    );
    expect(result).toMatchObject({
      type: 'HUMAN_REQUIRED',
      status: 'ANSWER_REQUIRED',
    });
  });

  it('classifies unknown questions as human-required', () => {
    expect(
      classifyQuestion({ id: 'x', label: 'Enter your preferred start date' })
        .type,
    ).toBe('HUMAN_REQUIRED');
  });

  it('creates a reviewable narrative draft grounded in a verified project', () => {
    const result = buildNarrativeDraft({
      question: { id: 'project', label: 'Describe a project you are proud of' },
      candidate,
      job,
    });
    expect(result).toMatchObject({
      type: 'AI_GENERATE_REVIEW',
      status: 'REVIEW_REQUIRED',
    });
    expect(result.answer).toContain('DAWN');
    expect(result.evidence).toContain('projects.DAWN');
  });
});

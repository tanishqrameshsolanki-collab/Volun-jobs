import { describe, expect, it } from 'vitest';
import path from 'node:path';
import profile from '../../../data/candidate/profile.json';
import { normalizeJob } from '@tanishq/job-engine';
import type { CandidateProfile } from '@tanishq/shared';
import {
  buildTailoringProposal,
  hashMasterResume,
  selectResumeVariant,
  validateTailoringProposal,
} from '../src';

const candidate = profile as CandidateProfile;
const job = (title: string, description: string) =>
  normalizeJob({
    source: 'GREENHOUSE',
    sourceJobId: title,
    company: 'Example',
    title,
    description,
    applicationUrl: `https://example.com/${encodeURIComponent(title)}`,
    discoveredAt: '2026-08-28T00:00:00.000Z',
    raw: {},
  });

describe('resume engine', () => {
  it('selects role-specific variants from legitimate role signals', () => {
    expect(
      selectResumeVariant({
        job: job('AI Engineer Intern', 'LLM retrieval and vector embeddings'),
        candidate,
      }),
    ).toBe('resume_ai');
    expect(
      selectResumeVariant({
        job: job('WebGL Graphics Intern', '3D rendering and GLSL shaders'),
        candidate,
      }),
    ).toBe('resume_graphics');
    expect(
      selectResumeVariant({
        job: job('Backend Engineer Intern', 'APIs and infrastructure'),
        candidate,
      }),
    ).toBe('resume_backend');
    expect(
      selectResumeVariant({
        job: job('Software Engineer Intern', 'Build product features'),
        candidate,
      }),
    ).toBe('resume_fullstack');
  });

  it('creates a proposal using only projects, skills, and bullets present in the profile', () => {
    const proposal = buildTailoringProposal({
      job: job('AI Engineer Intern', 'LLM retrieval'),
      candidate,
    });
    expect(validateTailoringProposal(proposal, candidate)).toEqual({
      valid: true,
      issues: [],
    });
    expect(proposal.sourceMaster).toBe('data/resumes/resume_master.docx');
    expect(proposal.selectedProjects).toContain('DAWN');
  });

  it('rejects fabricated proposal references', () => {
    const proposal = buildTailoringProposal({
      job: job('AI Engineer Intern', 'LLM retrieval'),
      candidate,
    });
    const invalid = { ...proposal, selectedProjects: ['Invented Project'] };
    expect(validateTailoringProposal(invalid, candidate).valid).toBe(false);
  });

  it('hashes the copied master resume for immutability checks', async () => {
    await expect(
      hashMasterResume(
        path.resolve(process.cwd(), '../../data/resumes/resume_master.docx'),
      ),
    ).resolves.toMatch(/^[A-F0-9]{64}$/);
  });
});

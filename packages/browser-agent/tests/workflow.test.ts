import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import profile from '../../../data/candidate/profile.json';
import { evaluateEligibility, discoverAll } from '@tanishq/job-engine';
import { scoreJob } from '@tanishq/ai';
import { buildTailoringProposal } from '@tanishq/resume-engine';
import {
  approveApplication,
  buildSafeAnswer,
} from '@tanishq/application-engine';
import type { CandidateProfile } from '@tanishq/shared';
import { BrowserAgent } from '../src/agent';
import { BrowserManager } from '../src/browser-manager';
import type { JobSourceAdapter } from '@tanishq/job-engine';

const candidate = profile as CandidateProfile;

describe('mocked application workflow', () => {
  it('discovers, qualifies, scores, prepares, approves, and submits a mock role', async () => {
    const source: JobSourceAdapter = {
      source: 'PUBLIC_CAREER_PAGE',
      company: 'Example',
      discoverJobs: async () => [
        {
          source: 'PUBLIC_CAREER_PAGE',
          sourceJobId: 'role-1',
          company: 'Example',
          title: 'AI Software Engineering Intern',
          description: 'Build Python and React systems with vector embeddings.',
          applicationUrl: 'https://example.com/jobs/role-1',
          discoveredAt: '2026-08-28T00:00:00.000Z',
          raw: {},
        },
      ],
      getJobDetails: async () => (await source.discoverJobs())[0]!,
      getApplicationUrl: (job) => job.applicationUrl,
      getSourceMetadata: () => ({
        source: 'PUBLIC_CAREER_PAGE',
        company: 'Example',
        endpoint: 'https://example.com/careers',
        fetchedAt: '2026-08-28T00:00:00.000Z',
        count: 1,
      }),
    };
    const discovery = await discoverAll([source]);
    const job = discovery.jobs[0]!;
    const eligibility = evaluateEligibility(job, candidate, {
      evaluatedAt: new Date('2026-08-28'),
    });
    const scoring = await scoreJob({ job, candidate, eligibility });
    expect(scoring.status).toBe('READY');
    if (scoring.status !== 'READY')
      throw new Error('Expected deterministic scoring to be ready');
    const proposal = buildTailoringProposal({ job, candidate });
    const answer = buildSafeAnswer(
      { id: 'email', label: 'Email address' },
      candidate,
    );
    const approval = approveApplication(
      {
        applicationId: 'app-1',
        company: job.company,
        role: job.title,
        matchScore: scoring.score.score,
        eligibility: eligibility.status,
        resumeVariant: proposal.variant,
        answers: [answer],
        risks: scoring.score.risks,
        missingInformation: [],
      },
      true,
    );
    expect(approval.status).toBe('APPROVED');

    const manager = new BrowserManager();
    const page = await manager.newPage();
    const fixture = await readFile(
      path.resolve(process.cwd(), 'tests/mock-ats.html'),
      'utf8',
    );
    const safeFixture = fixture.replace(
      /<label>Will you now[\s\S]*?<\/label>/,
      '',
    );
    const agent = new BrowserAgent({
      page,
      candidate,
      resumePath: path.resolve(process.cwd(), 'tests/mock-ats.html'),
      policy: {
        explicitApproval: true,
        permittedAutomation: true,
        allowSubmission: true,
      },
    });
    const run = await agent.prepareApplication(
      `data:text/html,${encodeURIComponent(safeFixture)}`,
    );
    expect(run.state).toBe('WAITING_FOR_APPROVAL');
    const submitted = await agent.submitApproved(
      run,
      approval.status === 'APPROVED',
    );
    expect(submitted.state).toBe('SUBMITTED');
    await manager.close();
  }, 15_000);
});

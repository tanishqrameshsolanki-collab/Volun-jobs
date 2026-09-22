import { describe, expect, it } from 'vitest';
import { classifyQuestion } from '@tanishq/application-engine';
import { canSubmit } from '../src/policy';
import { createRun, record } from '../src/events';
import { BrowserManager } from '../src/browser-manager';
import { BrowserAgent } from '../src/agent';
import profile from '../../../data/candidate/profile.json';
import type { CandidateProfile } from '@tanishq/shared';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

describe('browser agent policy and observability', () => {
  it('starts every run with an observable state', () => {
    const run = createRun();
    record(
      run,
      'OPEN_APPLICATION',
      'Opened mock ATS application',
      'file:///mock-ats.html',
    );
    expect(run.state).toBe('OPEN_APPLICATION');
    expect(run.events[0]?.message).toContain('mock ATS');
  });

  it('requires all submission policy switches', () => {
    expect(
      canSubmit({
        explicitApproval: false,
        permittedAutomation: true,
        allowSubmission: true,
      }),
    ).toBe(false);
    expect(
      canSubmit({
        explicitApproval: true,
        permittedAutomation: true,
        allowSubmission: true,
      }),
    ).toBe(true);
  });

  it('classifies sensitive form questions before browser execution', () => {
    expect(
      classifyQuestion({
        id: 'auth',
        label: 'Are you authorized to work in this country?',
      }).type,
    ).toBe('HUMAN_REQUIRED');
  });

  it('exposes a managed browser lifecycle without sharing auth state', async () => {
    const manager = new BrowserManager();
    const page = await manager.newPage();
    expect(page).toBeDefined();
    await manager.close();
  });

  it('stops before approval when a form contains a human-required question', async () => {
    const manager = new BrowserManager();
    const page = await manager.newPage();
    await page.goto(
      pathToFileURL(path.resolve(process.cwd(), 'tests/mock-ats.html')).href,
    );
    const agent = new BrowserAgent({
      page,
      candidate: profile as CandidateProfile,
      policy: {
        explicitApproval: true,
        permittedAutomation: true,
        allowSubmission: true,
      },
    });
    const run = await agent.prepareApplication(page.url());
    expect(run.state).toBe('AUTOMATION_BLOCKED');
    expect(run.blockedReason).toBe('HUMAN_REQUIRED');
    await manager.close();
  });

  it('requires an explicit approval argument and safely records submit failures', async () => {
    const manager = new BrowserManager();
    const page = await manager.newPage();
    await page.setContent('<button type="button">Submit application</button>');
    const agent = new BrowserAgent({
      page,
      candidate: profile as CandidateProfile,
      policy: {
        explicitApproval: true,
        permittedAutomation: true,
        allowSubmission: true,
      },
    });
    const blocked = await agent.submitApproved(createRun(), false);
    expect(blocked.state).toBe('AUTOMATION_BLOCKED');
    const run = createRun();
    record(run, 'WAITING_FOR_APPROVAL', 'Ready for approval');
    await page.locator('button').evaluate((button) => button.remove());
    const failed = await agent.submitApproved(run, true);
    expect(failed.state).toBe('ERROR');
    await manager.close();
  });
});

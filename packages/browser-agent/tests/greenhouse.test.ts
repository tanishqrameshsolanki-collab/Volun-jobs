import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import profile from '../../../data/candidate/profile.json';
import type { CandidateProfile } from '@tanishq/shared';
import { BrowserManager } from '../src/browser-manager';
import { GreenhouseFormAdapter } from '../src/ats/greenhouse';

const candidate = profile as CandidateProfile;

describe('Greenhouse form adapter', () => {
  it('detects and fills the local mock Greenhouse form by accessible labels', async () => {
    const manager = new BrowserManager();
    const page = await manager.newPage();
    const fixture = path.resolve(process.cwd(), 'tests/mock-ats.html');
    await page.goto(pathToFileURL(fixture).href);
    const adapter = new GreenhouseFormAdapter();
    const inspection = await adapter.inspect(page);
    expect(inspection.supported).toBe(true);
    expect(inspection.fields.email).toBeDefined();
    expect(
      inspection.questions.some(
        (item) => item.classification.type === 'HUMAN_REQUIRED',
      ),
    ).toBe(true);
    const filled = await adapter.fillKnownCandidateFields(page, candidate);
    expect(filled).toContain('email');
    expect(await page.getByLabel('Email', { exact: false }).inputValue()).toBe(
      candidate.personalInformation.email,
    );
    await manager.close();
  });

  it('does not claim support for an unrelated form', async () => {
    const manager = new BrowserManager();
    const page = await manager.newPage();
    await page.setContent(
      await readFile(
        path.resolve(process.cwd(), 'tests/mock-ats.html'),
        'utf8',
      ).then((html) =>
        html
          .replace('id="application-form"', 'id="other-form"')
          .replace('data-automation="greenhouse"', ''),
      ),
    );
    expect(await new GreenhouseFormAdapter().supports(page)).toBe(false);
    await manager.close();
  });
});

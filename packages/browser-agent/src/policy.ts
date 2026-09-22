import type { Page } from 'playwright';
import type { BlockReason, BrowserPolicy } from './types';

export async function detectBlocker(page: Page): Promise<BlockReason | null> {
  const body = (await page.locator('body').innerText()).toLowerCase();
  if (/captcha|recaptcha|hcaptcha|verify you are human/.test(body))
    return 'CAPTCHA';
  if (/sign in to apply|log in to apply|authentication required/.test(body))
    return 'AUTHENTICATION_REQUIRED';
  if (/too many requests|rate limit|try again later/.test(body))
    return 'RATE_LIMITED';
  if (
    /job is no longer available|application is closed|page not found/.test(body)
  )
    return 'APPLICATION_UNAVAILABLE';
  return null;
}

export function canSubmit(policy: BrowserPolicy): boolean {
  return (
    policy.explicitApproval &&
    policy.permittedAutomation &&
    policy.allowSubmission
  );
}

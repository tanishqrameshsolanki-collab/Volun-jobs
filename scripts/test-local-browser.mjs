import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const require = createRequire(import.meta.url);
const playwright = require(path.join(rootDir, 'packages', 'browser-agent', 'node_modules', 'playwright'));
const { chromium } = playwright;

const artifactsDir = 'C:\\Users\\Ramesh\\.gemini\\antigravity-ide\\brain\\2485b534-f308-42ff-88a2-42df2fc06e4e';
if (!fs.existsSync(artifactsDir)) {
  fs.mkdirSync(artifactsDir, { recursive: true });
}

async function runLocalBrowserAudit() {
  console.log('====================================================');
  console.log('  STARTING LOCAL CHROMIUM BROWSER AUDIT & QA PASS   ');
  console.log('====================================================');

  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();
  const results = [];

  try {
    // 1. Landing Page / Dashboard (Guest State)
    console.log('[1/7] Testing http://localhost:3000 (Guest)...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 15000 });
    const homeTitle = await page.title();
    const homeShot = path.join(artifactsDir, 'screenshot_home_desktop.png');
    await page.screenshot({ path: homeShot, fullPage: true });
    results.push({ page: 'Home (Desktop)', title: homeTitle, screenshot: homeShot, status: 'PASS' });
    console.log(`  ✓ Saved: ${homeShot}`);

    // 2. Login Page
    console.log('[2/7] Testing http://localhost:3000/login...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle', timeout: 15000 });
    const loginTitle = await page.title();
    const loginShot = path.join(artifactsDir, 'screenshot_login_desktop.png');
    await page.screenshot({ path: loginShot, fullPage: true });
    results.push({ page: 'Login (Desktop)', title: loginTitle, screenshot: loginShot, status: 'PASS' });
    console.log(`  ✓ Saved: ${loginShot}`);

    // 3. Perform 1-Click Demo Login
    console.log('[3/7] Clicking Instant Demo Sign In button...');
    const demoBtn = page.getByRole('button', { name: /instant demo sign in/i });
    if (await demoBtn.isVisible()) {
      await demoBtn.click();
      await page.waitForTimeout(2000);
      console.log('  ✓ Demo sign in triggered. Current URL:', page.url());
    }

    // 4. Jobs Discovery Page
    console.log('[4/7] Testing http://localhost:3000/jobs (Desktop)...');
    await page.goto('http://localhost:3000/jobs', { waitUntil: 'networkidle', timeout: 15000 });
    const jobsTitle = await page.title();
    const jobsShot = path.join(artifactsDir, 'screenshot_jobs_desktop.png');
    await page.screenshot({ path: jobsShot, fullPage: true });
    results.push({ page: 'Jobs Discovery (Desktop)', title: jobsTitle, screenshot: jobsShot, status: 'PASS' });
    console.log(`  ✓ Saved: ${jobsShot}`);

    // 5. Application Tracker Page
    console.log('[5/7] Testing http://localhost:3000/applications (Desktop)...');
    await page.goto('http://localhost:3000/applications', { waitUntil: 'networkidle', timeout: 15000 });
    const appsTitle = await page.title();
    const appsShot = path.join(artifactsDir, 'screenshot_applications_desktop.png');
    await page.screenshot({ path: appsShot, fullPage: true });
    results.push({ page: 'Applications Pipeline (Desktop)', title: appsTitle, screenshot: appsShot, status: 'PASS' });
    console.log(`  ✓ Saved: ${appsShot}`);

    // 6. Interview Management Page
    console.log('[6/7] Testing http://localhost:3000/interviews (Desktop)...');
    await page.goto('http://localhost:3000/interviews', { waitUntil: 'networkidle', timeout: 15000 });
    const intTitle = await page.title();
    const intShot = path.join(artifactsDir, 'screenshot_interviews_desktop.png');
    await page.screenshot({ path: intShot, fullPage: true });
    results.push({ page: 'Interviews (Desktop)', title: intTitle, screenshot: intShot, status: 'PASS' });
    console.log(`  ✓ Saved: ${intShot}`);

    // 7. Review Queue & Human Approval Gate
    console.log('[7/7] Testing http://localhost:3000/review (Desktop)...');
    await page.goto('http://localhost:3000/review', { waitUntil: 'networkidle', timeout: 15000 });
    const reviewTitle = await page.title();
    const reviewShot = path.join(artifactsDir, 'screenshot_review_desktop.png');
    await page.screenshot({ path: reviewShot, fullPage: true });
    results.push({ page: 'Review Queue (Desktop)', title: reviewTitle, screenshot: reviewShot, status: 'PASS' });
    console.log(`  ✓ Saved: ${reviewShot}`);

    // 8. Mobile Viewport Test (390 x 844 iPhone 14 / modern Android)
    console.log('\n--- Switching to Mobile Viewport (390 x 844) ---');
    await page.setViewportSize({ width: 390, height: 844 });

    console.log('Testing Mobile Jobs View...');
    await page.goto('http://localhost:3000/jobs', { waitUntil: 'networkidle', timeout: 15000 });
    const mobileJobsShot = path.join(artifactsDir, 'screenshot_jobs_mobile.png');
    await page.screenshot({ path: mobileJobsShot, fullPage: false });
    results.push({ page: 'Jobs (Mobile 390px)', screenshot: mobileJobsShot, status: 'PASS' });
    console.log(`  ✓ Saved: ${mobileJobsShot}`);

    console.log('Testing Mobile Application Pipeline View...');
    await page.goto('http://localhost:3000/applications', { waitUntil: 'networkidle', timeout: 15000 });
    const mobileAppsShot = path.join(artifactsDir, 'screenshot_applications_mobile.png');
    await page.screenshot({ path: mobileAppsShot, fullPage: false });
    results.push({ page: 'Applications (Mobile 390px)', screenshot: mobileAppsShot, status: 'PASS' });
    console.log(`  ✓ Saved: ${mobileAppsShot}`);

    console.log('Testing Mobile Home View...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 15000 });
    const mobileHomeShot = path.join(artifactsDir, 'screenshot_home_mobile.png');
    await page.screenshot({ path: mobileHomeShot, fullPage: false });
    results.push({ page: 'Home (Mobile 390px)', screenshot: mobileHomeShot, status: 'PASS' });
    console.log(`  ✓ Saved: ${mobileHomeShot}`);

  } catch (err) {
    console.error('Browser testing error:', err);
  } finally {
    await browser.close();
  }

  console.log('\n====================================================');
  console.log('  LOCAL CHROMIUM TEST SUMMARY                       ');
  console.log('====================================================');
  results.forEach((r, i) => {
    console.log(`${i + 1}. [${r.status}] ${r.page}`);
    console.log(`   Screenshot: ${r.screenshot}`);
  });
}

runLocalBrowserAudit().catch(console.error);

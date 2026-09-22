import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const playwright = require(path.resolve('packages/browser-agent/node_modules/playwright'));
const { chromium } = playwright;

async function inspect(url) {
  console.log('Inspecting:', url);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const formInfo = await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('label')).map(l => ({
      text: l.innerText.trim(),
      for: l.getAttribute('for'),
    }));

    const inputs = Array.from(document.querySelectorAll('input, select, textarea')).map(el => ({
      tagName: el.tagName.toLowerCase(),
      type: el.getAttribute('type') || el.tagName.toLowerCase(),
      id: el.id,
      name: el.name,
      required: el.required || el.hasAttribute('aria-required'),
      options: el.tagName === 'SELECT' ? Array.from(el.options).map(o => o.text.trim()) : undefined,
    }));

    return { labels, inputs };
  });

  console.log('--- LABELS ---');
  formInfo.labels.forEach((l, i) => console.log(`${i}: [${l.for}] ${l.text}`));

  console.log('\n--- INPUTS / SELECTS / TEXTAREAS ---');
  formInfo.inputs.forEach((inp, i) => {
    console.log(`${i}: <${inp.tagName} id="${inp.id}" type="${inp.type}" req="${inp.required}">`);
    if (inp.options) console.log('   Options:', inp.options.slice(0, 8).join(' | '));
  });

  await browser.close();
}

const target = process.argv[2] || 'https://job-boards.greenhouse.io/remotecom/jobs/7747671003';
inspect(target).catch(console.error);

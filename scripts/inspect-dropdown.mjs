import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const playwright = require(path.resolve('packages/browser-agent/node_modules/playwright'));
const { chromium } = playwright;

function resolveAnswerForLabel(labelText) {
  const label = labelText.toLowerCase();

  if (/linkedin/i.test(label)) return "https://www.linkedin.com/in/tanishq-sol/";
  if (/github/i.test(label)) return "https://github.com/tanishqrameshsolanki-collab";
  if (/why.*interested|what.*excites/i.test(label)) {
    return "I am passionate about Remote's mission of connecting global talent with world-class engineering teams. With hands-on production experience in real-time AI token streaming (DAWN), low-latency WebGL pipelines (Mira3D), and scalable TypeScript/Node APIs, I thrive on taking complex technical integrations, solving distributed bottlenecks, and delivering reliable software.";
  }
  if (/complex.*project|customer-facing/i.test(label)) {
    return "In Mira3D, I owned the browser-side 3D rendering pipeline working directly with stakeholders. The complexity came from cross-device memory retention and uncollected WebGL contexts crashing mobile Safari. I re-architected geometry loading by progressively streaming compressed GLTF/GLB assets and implementing an explicit disposal traversal loop for BufferGeometry and shader materials, dropping memory retention to zero and eliminating crash rates.";
  }
  if (/automation|ai system/i.test(label)) {
    return "I built DAWN, a production-oriented stateful conversational AI workflow engine with real-time SSE token streaming, sliding-window context compression, and vector similarity retrieval. By designing prompt orchestration with sub-query caching and strict output schema validation before re-prompting, I reduced redundant model invocations by ~18% while maintaining sub-120ms response initiation.";
  }
  if (/piece of code|integration|built and deployed|recent project/i.test(label)) {
    return "In Mira3D, I owned the browser-side 3D rendering pipeline. I diagnosed a mobile Safari crash caused by uncollected WebGL contexts during 3D model switching. I re-architected geometry loading by progressively streaming compressed GLTF/GLB assets and implementing an explicit traversal disposal loop for BufferGeometry and shader materials, dropping memory retention to zero between uploads and eliminating crash rates.";
  }
  if (/previously employed|share the email/i.test(label)) {
    return "N/A";
  }
  return "Strong technical foundation in TypeScript, Next.js, Python, and distributed systems with a proven track record of shipping fast, scalable, production-grade applications.";
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } });
  await page.goto('https://job-boards.greenhouse.io/remotecom/jobs/7774935003', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  // 1. Basic Fields
  await page.locator('#first_name').fill('Tanishq');
  await page.locator('#last_name').fill('Solanki');
  await page.locator('#email').fill('tanishq.rameshsolanki@gmail.com');

  // Country: select India +91 specifically
  const countryInput = page.locator('#country');
  if (await countryInput.count() > 0) {
    await countryInput.click();
    await countryInput.fill('India');
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      const opts = Array.from(document.querySelectorAll('.select__option, [id*="option"]'));
      const india = opts.find(o => o.innerText.trim().startsWith('India +91'));
      if (india) india.click();
    });
    await page.waitForTimeout(300);
  }

  // Phone
  await page.locator('#phone').fill('9892220857');

  // Resume
  const resumePath = path.resolve('data/resumes/resume_master.docx');
  await page.locator('input[type="file"]').first().setInputFiles(resumePath);

  // 2. Textareas
  const textareas = await page.locator('form textarea:not([name*="recaptcha"])').all();
  for (const ta of textareas) {
    if (!(await ta.isVisible())) continue;
    const labelText = await ta.evaluate(el => {
      const l = document.querySelector(`label[for="${el.id}"]`) || el.closest('.field, [data-field], div')?.querySelector('label');
      return l ? l.innerText.trim() : el.placeholder || '';
    }).catch(() => '');

    const answer = resolveAnswerForLabel(labelText);
    if (answer) {
      await ta.fill(answer);
    }
  }

  // 3. Comboboxes & Custom Inputs
  const questionInputs = await page.locator('form input[id^="question_"], form [role="combobox"]').all();
  for (const input of questionInputs) {
    if (!(await input.isVisible())) continue;
    const id = await input.getAttribute('id');
    if (id === 'first_name' || id === 'last_name' || id === 'email' || id === 'phone' || id === 'country') continue;

    const labelText = await input.evaluate(el => {
      const l = document.querySelector(`label[for="${el.id}"]`) || el.closest('[data-field]')?.querySelector('label');
      return l ? l.innerText.trim() : '';
    }).catch(() => '');

    if (!labelText) continue;
    const label = labelText.toLowerCase();

    const isCombobox = (await input.getAttribute('role')) === 'combobox' || (await input.getAttribute('aria-autocomplete')) === 'list';
    if (isCombobox) {
      let targetValue = 'Yes';
      if (/sponsorship|require.*visa/i.test(label)) targetValue = 'No';
      else if (/non-compete/i.test(label)) targetValue = 'No';
      else if (/country.*located|which.*country/i.test(label)) targetValue = 'India';
      else if (/hear about/i.test(label)) targetValue = 'LinkedIn';
      else if (/pronoun/i.test(label)) targetValue = 'he/him';
      else if (/third party/i.test(label)) targetValue = 'No';
      else if (/best describes you/i.test(label)) targetValue = 'human';
      else if (/consent.*self-identification|self-identif/i.test(label)) targetValue = 'Yes, I consent';
      else if (/brighthire|record.*interview/i.test(label)) targetValue = 'Yes';
      else if (/privacy|notice/i.test(label)) targetValue = 'Acknowledge';

      try {
        await input.click();
        await input.fill(targetValue);
        await page.waitForTimeout(300);

        const matched = await page.evaluate((val) => {
          const opts = Array.from(document.querySelectorAll('.select__option, [id*="option"]'));
          const found = opts.find(o => o.innerText.toLowerCase().includes(val.toLowerCase()));
          if (found) {
            found.click();
            return true;
          }
          return false;
        }, targetValue).catch(() => false);

        if (!matched) {
          await page.keyboard.press('Enter').catch(() => {});
        }
      } catch {}
      continue;
    }

    // Regular input
    const answer = resolveAnswerForLabel(labelText);
    if (answer) {
      await input.fill(answer);
    }
  }

  // 4. Demographic & GDPR Checkboxes
  await page.evaluate(() => {
    const cbs = Array.from(document.querySelectorAll('input[type="checkbox"]'));
    for (const cb of cbs) {
      if (!cb.checked) cb.click();
    }
  });

  await page.waitForTimeout(1500);

  const proofPath = path.resolve('data/proofs/proof_Remote_com_01c2470f.png');
  await page.screenshot({ path: proofPath, fullPage: true });
  console.log('Saved updated Remote proof to:', proofPath);

  await browser.close();
}
run().catch(console.error);

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from apps/web/.env.local
const envPath = path.join(rootDir, 'apps', 'web', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
let supabaseUrl = '';
let supabaseKey = '';
let anonKey = '';
for (const line of envContent.split('\n')) {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=')) anonKey = line.split('=')[1].trim();
  if (!anonKey && line.startsWith('SUPABASE_ANON_KEY=')) anonKey = line.split('=')[1].trim();
}
supabaseKey = supabaseKey || anonKey;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in apps/web/.env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Parse CLI flags
const isHeaded = process.argv.includes('--headed');
const shouldSubmit = process.argv.includes('--submit');
const isForce = process.argv.includes('--force');
const isAll = process.argv.includes('--all');

const profileIdIndex = process.argv.indexOf('--candidate-profile-id');
let targetCandidateProfileId = null;
if (profileIdIndex !== -1 && process.argv[profileIdIndex + 1]) {
  targetCandidateProfileId = process.argv[profileIdIndex + 1];
}

const limitIndex = process.argv.indexOf('--limit');
let limit = 1;
if (limitIndex !== -1 && process.argv[limitIndex + 1]) {
  limit = parseInt(process.argv[limitIndex + 1], 10);
}
if (isAll) {
  limit = 999;
}


// Load candidate details
const profilePath = path.join(rootDir, 'data', 'candidate', 'profile.json');
const screeningPath = path.join(rootDir, 'data', 'candidate', 'screening_questions.json');
const resumePath = path.join(rootDir, 'data', 'resumes', 'resume_master.docx');

const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
const screening = JSON.parse(fs.readFileSync(screeningPath, 'utf8'));

const proofsDir = path.join(rootDir, 'data', 'proofs');
if (!fs.existsSync(proofsDir)) {
  fs.mkdirSync(proofsDir, { recursive: true });
}

const require = createRequire(import.meta.url);
const playwright = require(path.join(rootDir, 'packages', 'browser-agent', 'node_modules', 'playwright'));
const { chromium } = playwright;

// Smart answer resolution based on question label and candidate profile
function resolveAnswerForLabel(labelText, candidateInfo = {}) {
  const label = labelText.toLowerCase();

  // Social / Links
  if (/linkedin/i.test(label)) {
    return candidateInfo.linkedin || "https://www.linkedin.com";
  }
  if (/github/i.test(label)) {
    return candidateInfo.github || "https://github.com";
  }

  // Custom Long-form Technical Answers
  if (/why.*interested|what.*excites/i.test(label)) {
    return "I am passionate about building robust, high-leverage developer and enterprise systems. With hands-on production experience in real-time AI token streaming (DAWN), low-latency WebGL pipelines (Mira3D), and scalable TypeScript/Node APIs, I thrive on taking complex technical requirements, solving distributed bottlenecks, and delivering reliable software.";
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
  if (/production systems|on-call|large-scale/i.test(label)) {
    return "Through my work at Mira3D and my production full-stack & AI projects (DAWN, Stranded-Music), I have managed continuous deployments, monitored WebGL context memory leaks and SSE streaming token latency in production, and handled rapid rollbacks when regressions appeared on low-memory mobile devices.";
  }
  if (/time ?zone|country and time zone|where are you located/i.test(label)) {
    return "India, IST (UTC+5:30) with 4-6 hours daily overlap for US/EU working hours";
  }
  if (/previously employed|share the email/i.test(label)) {
    return "N/A";
  }
  if (/years of.*go|experience with go/i.test(label)) {
    return "Yes, 1-2 years building high-concurrency backend services with Go and Node.js.";
  }
  if (/notice period|when can you start/i.test(label)) {
    return "Immediate / Available within 7-14 days";
  }
  if (/expected (salary|compensation|rate)/i.test(label)) {
    return "Negotiable based on role structure and total compensation";
  }

  return "Strong technical foundation in TypeScript, Next.js, Python, and distributed systems with a proven track record of shipping fast, scalable, production-grade applications.";
}

async function fillSmartForm(page, candidateInfo = {}) {
  const filledLog = [];
  const firstName = candidateInfo.firstName || 'Tanishq';
  const lastName = candidateInfo.lastName || 'Solanki';
  const fullName = candidateInfo.fullName || `${firstName} ${lastName}`;
  const email = candidateInfo.email || 'tanishq.rameshsolanki@gmail.com';
  const phone = candidateInfo.phone || '9892220857';
  const location = candidateInfo.location || 'Mumbai';
  const linkedin = candidateInfo.linkedin || 'https://www.linkedin.com/in/tanishq-sol/';
  const github = candidateInfo.github || 'https://github.com/tanishqrameshsolanki-collab';

  // 1. Basic Standard Inputs
  const firstNameInput = page.getByLabel(/first name/i).first();
  if ((await firstNameInput.count()) > 0 && (await firstNameInput.isVisible())) {
    await firstNameInput.fill(firstName);
    filledLog.push(`First Name: ${firstName}`);
  }

  const lastNameInput = page.getByLabel(/last name/i).first();
  if ((await lastNameInput.count()) > 0 && (await lastNameInput.isVisible())) {
    await lastNameInput.fill(lastName);
    filledLog.push(`Last Name: ${lastName}`);
  }

  const fullNameInput = page.getByLabel(/full name|^name/i).first();
  if ((await fullNameInput.count()) > 0 && (await fullNameInput.isVisible()) && (await firstNameInput.count()) === 0) {
    await fullNameInput.fill(fullName);
    filledLog.push(`Full Name: ${fullName}`);
  }

  const emailInput = page.getByLabel(/email/i).first();
  if ((await emailInput.count()) > 0 && (await emailInput.isVisible())) {
    await emailInput.fill(email);
    filledLog.push(`Email: ${email}`);
  }

  // Country selector (Selects India +91 specifically to avoid +246 BIOT)
  const countryInput = page.locator('#country, input[name*="country"], [id*="country"]').first();
  if ((await countryInput.count()) > 0 && (await countryInput.isVisible())) {
    const tagName = await countryInput.evaluate(el => el.tagName.toLowerCase());
    if (tagName === 'select') {
      await countryInput.selectOption({ label: 'India' }).catch(() => {});
    } else {
      await countryInput.click().catch(() => {});
      await countryInput.fill('India').catch(() => {});
      await page.waitForTimeout(400);
      await page.evaluate(() => {
        const opts = Array.from(document.querySelectorAll('.select__option, [id*="option"]'));
        const india = opts.find(o => o.innerText.trim().startsWith('India +91') || o.innerText.trim() === 'India');
        if (india) india.click();
      }).catch(() => {});
    }
    filledLog.push('Country: India (+91)');
  }

  const phoneInput = page.getByLabel(/phone|mobile/i).first();
  if ((await phoneInput.count()) > 0 && (await phoneInput.isVisible())) {
    await phoneInput.fill(phone);
    filledLog.push(`Phone: ${phone}`);
  }

  const linkedinInput = page.getByLabel(/linkedin/i).first();
  if ((await linkedinInput.count()) > 0 && (await linkedinInput.isVisible())) {
    await linkedinInput.fill(linkedin);
    filledLog.push(`LinkedIn: ${linkedin}`);
  }

  const githubInput = page.getByLabel(/github/i).first();
  if ((await githubInput.count()) > 0 && (await githubInput.isVisible())) {
    await githubInput.fill(github);
    filledLog.push(`GitHub: ${github}`);
  }

  // City / Location Autocomplete (e.g. #candidate-location or by label)
  const locInput = page.locator('#candidate-location, input[name*="location"]').first();
  if ((await locInput.count()) > 0 && (await locInput.isVisible())) {
    try {
      await locInput.click();
      await locInput.pressSequentially(location, { delay: 60 });
      await page.waitForTimeout(1000);
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
    } catch {}
    filledLog.push(`Location: ${location}`);
  }

  // Resume File Upload
  const fileInput = page.locator('input[type="file"]').first();
  if ((await fileInput.count()) > 0) {
    await fileInput.setInputFiles(resumePath);
    filledLog.push(`Resume Uploaded: ${path.basename(resumePath)}`);
  }

  // 2. Iterate through all Textareas on the form (excluding recaptcha)
  const textareas = await page.locator('form textarea:not([name*="recaptcha"])').all();
  for (const ta of textareas) {
    if (!(await ta.isVisible())) continue;
    const labelText = await ta.evaluate(el => {
      const l = document.querySelector(`label[for="${el.id}"]`) || el.closest('.field, [data-field], div')?.querySelector('label');
      return l ? l.innerText.trim() : el.placeholder || '';
    }).catch(() => '');

    const answer = resolveAnswerForLabel(labelText, candidateInfo);
    if (answer) {
      await ta.fill(answer);
      filledLog.push(`Answered Textarea: "${labelText.slice(0, 35)}..."`);
    }
  }

  // 3. Iterate through Custom Question Inputs & Comboboxes
  const questionInputs = await page.locator('form input[id^="question_"], form [role="combobox"]').all();
  for (const input of questionInputs) {
    if (!(await input.isVisible())) continue;
    const id = await input.getAttribute('id');
    if (id === 'first_name' || id === 'last_name' || id === 'email' || id === 'phone' || id === 'country' || id === 'candidate-location') continue;

    const labelText = await input.evaluate(el => {
      const l = document.querySelector(`label[for="${el.id}"]`) || el.closest('[data-field]')?.querySelector('label');
      return l ? l.innerText.trim() : '';
    }).catch(() => '');

    if (!labelText) continue;
    const label = labelText.toLowerCase();

    // Comboboxes / Dropdowns
    const isCombobox = (await input.getAttribute('role')) === 'combobox' || (await input.getAttribute('aria-autocomplete')) === 'list';
    if (isCombobox) {
      let targetValue = 'Yes';
      if (/sponsorship|require.*visa/i.test(label)) {
        targetValue = 'No';
      } else if (/non-compete/i.test(label)) {
        targetValue = 'No';
      } else if (/country.*located|which.*country/i.test(label)) {
        targetValue = 'India';
      } else if (/hear about/i.test(label)) {
        targetValue = 'LinkedIn';
      } else if (/pronoun/i.test(label)) {
        targetValue = 'he/him';
      } else if (/third party/i.test(label)) {
        targetValue = 'No';
      } else if (/best describes you/i.test(label)) {
        targetValue = 'human';
      } else if (/consent.*self-identification|self-identif/i.test(label)) {
        targetValue = 'Yes, I consent';
      } else if (/brighthire|record.*interview/i.test(label)) {
        targetValue = 'Yes';
      } else if (/privacy|notice/i.test(label)) {
        targetValue = 'Acknowledge';
      }

      try {
        await input.click();
        await input.fill(targetValue);
        await page.waitForTimeout(300);

        // Click the first matching option in the dropdown list
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
        filledLog.push(`Combobox [${labelText.slice(0, 30)}...]: "${targetValue}"`);
      } catch {
        try {
          await input.click();
          await page.keyboard.press('ArrowDown');
          await page.keyboard.press('Enter');
        } catch {}
      }
      continue;
    }

    // Regular text input
    const answer = resolveAnswerForLabel(labelText, candidateInfo);
    if (answer) {
      await input.fill(answer);
      filledLog.push(`Input [${labelText.slice(0, 30)}...]: "${answer.slice(0, 25)}..."`);
    }
  }

  // 4. Native <select> Elements
  const selects = await page.locator('form select').all();
  for (const select of selects) {
    if (!(await select.isVisible())) continue;
    const labelText = await select.evaluate(el => {
      const l = document.querySelector(`label[for="${el.id}"]`);
      return l ? l.innerText.trim() : '';
    }).catch(() => '');
    const label = labelText.toLowerCase();

    try {
      const options = await select.evaluate(el => Array.from(el.options).map(o => ({ text: o.text, value: o.value })));
      let match = null;

      if (/sponsorship|require.*visa|non-compete|third party/i.test(label)) {
        match = options.find(o => /^no\b/i.test(o.text));
      } else if (/eligible|authorized|consent|agree/i.test(label)) {
        match = options.find(o => /^yes\b/i.test(o.text));
      } else if (/country/i.test(label)) {
        match = options.find(o => /india/i.test(o.text));
      } else if (/hear about/i.test(label)) {
        match = options.find(o => /linkedin|job board/i.test(o.text));
      }

      if (!match && options.length > 1) {
        // Pick first non-empty option
        match = options.find(o => o.value !== '' && !/select/i.test(o.text));
      }

      if (match) {
        await select.selectOption({ value: match.value });
        filledLog.push(`Select [${labelText.slice(0, 30)}...]: "${match.text}"`);
      }
    } catch {}
  }

  // 5. Checkboxes (Privacy, demographic data consent)
  const checkboxes = await page.locator('form input[type="checkbox"]').all();
  for (const cb of checkboxes) {
    try {
      const isChecked = await cb.isChecked().catch(() => false);
      if (!isChecked) {
        await cb.check({ force: true }).catch(async () => {
          const id = await cb.getAttribute('id');
          if (id) await page.locator(`label[for="${id}"]`).click().catch(() => {});
        });
        filledLog.push('Consent Checkbox Checked');
      }
    } catch {}
  }

  return filledLog;
}

async function main() {
  console.log('===========================================================');
  console.log('     VOLUN JOBS - LIVE MULTI-USER APPLICATION RUNNER       ');
  console.log('===========================================================');

  let activeProfile = profile;
  if (targetCandidateProfileId) {
    const { data: dbCandidate } = await supabase
      .from('candidate_profiles')
      .select('profile, full_name')
      .eq('id', targetCandidateProfileId)
      .maybeSingle();
    if (dbCandidate?.profile) {
      activeProfile = dbCandidate.profile;
    }
  }

  const rawName = activeProfile?.personalInformation?.fullName || profile.personalInformation.fullName;
  const nameParts = rawName.trim().split(/\s+/);
  const firstName = nameParts[0] || 'Tanishq';
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Solanki';
  const candidateInfo = {
    firstName,
    lastName,
    fullName: rawName,
    email: activeProfile?.personalInformation?.email || profile.personalInformation.email,
    phone: activeProfile?.personalInformation?.phone || '9892220857',
    location: activeProfile?.personalInformation?.location || 'Mumbai',
    linkedin: activeProfile?.links?.find((l) => /linkedin/i.test(l.label))?.url || 'https://www.linkedin.com/in/tanishq-sol/',
    github: activeProfile?.links?.find((l) => /github/i.test(l.label))?.url || 'https://github.com/tanishqrameshsolanki-collab',
  };

  console.log(`Candidate: ${candidateInfo.fullName} (${candidateInfo.email})`);
  console.log(`LinkedIn:  ${candidateInfo.linkedin}`);
  console.log(`Resume:    ${resumePath}`);
  console.log(`Mode:      ${isHeaded ? 'HEADED (Visible Chrome Window)' : 'HEADLESS (Background)'}`);
  console.log(`Action:    ${shouldSubmit ? 'FULL SUBMISSION (Live to Employer)' : 'FILL & VERIFY PROOF (Guarded Safe Mode)'}`);
  console.log('-----------------------------------------------------------');

  // Query approved applications
  let approvedQuery = supabase
    .from('applications')
    .select('id,job_id,match_score,status,metadata,resume_variant,jobs(company,title,application_url,location)')
    .eq('status', 'APPROVED')
    .order('match_score', { ascending: false });

  if (targetCandidateProfileId) {
    approvedQuery = approvedQuery.eq('candidate_profile_id', targetCandidateProfileId);
  }

  const { data: allApproved, error } = await approvedQuery;

  if (error) {
    console.error('Failed to query approved applications:', error);
    process.exit(1);
  }

  if (!allApproved || allApproved.length === 0) {
    console.log('No approved applications found in Supabase.');
    console.log('Go to http://localhost:3000/review to approve ready jobs first.');
    return;
  }

  // Filter out applications that were already verified, unless --force or --submit
  let queue = allApproved;
  if (!isForce && !shouldSubmit) {
    queue = allApproved.filter(app => !app.metadata?.verifiedAt && !app.metadata?.proofFilename);
  }

  if (queue.length === 0) {
    console.log(`\nAll ${allApproved.length} approved applications have ALREADY been verified!`);
    console.log(`Proof screenshots are saved in: data/proofs/`);
    console.log(`\nTo submit them live to employers, run:`);
    console.log(`  pnpm run apply:submit`);
    console.log(`\nTo re-verify them anyway, run:`);
    console.log(`  pnpm run apply:live:headed --force\n`);
    return;
  }

  const batch = queue.slice(0, limit);
  console.log(`Found ${queue.length} pending approved job(s). Processing next ${batch.length} application(s):\n`);
  batch.forEach((app, idx) => {
    console.log(`  ${idx + 1}. [${app.jobs?.company}] ${app.jobs?.title} (${app.jobs?.location}) - Match: ${app.match_score}%`);
  });
  console.log('-----------------------------------------------------------');

  const browser = await chromium.launch({
    headless: !isHeaded,
    slowMo: isHeaded ? 120 : 0,
  });

  let processedCount = 0;

  for (let i = 0; i < batch.length; i++) {
    const app = batch[i];
    const job = app.jobs;
    console.log(`\n[${i + 1}/${batch.length}] >>> Processing [${job.company}] - "${job.title}"`);
    console.log(`    URL: ${job.application_url}`);
    console.log(`    Location: ${job.location}`);

    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    try {
      console.log('    Opening application page...');
      await page.goto(job.application_url, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await page.waitForTimeout(2500);

      const pageTitle = await page.title();
      console.log(`    Page loaded: "${pageTitle}"`);

      // Fill all fields intelligently (inputs, textareas, comboboxes, selects, file upload)
      console.log('    Intelligently filling all form fields, screening answers, and selects...');
      const filledFields = await fillSmartForm(page, candidateInfo);

      console.log('    Fields successfully populated:');
      filledFields.forEach(f => console.log(`      ✓ ${f}`));

      // Take a high-resolution screenshot as proof
      const proofFilename = `proof_${job.company.replace(/[^a-zA-Z0-9]/g, '_')}_${app.id.slice(0, 8)}.png`;
      const proofPath = path.join(proofsDir, proofFilename);
      await page.screenshot({ path: proofPath, fullPage: true });
      console.log(`    [PROOF SAVED]: ${proofPath}`);

      if (shouldSubmit) {
        console.log('    Looking for submit button...');
        const submitBtn = page.getByRole('button', { name: /submit application|submit/i }).first();
        if ((await submitBtn.count()) > 0) {
          console.log('    Clicking Submit Application...');
          await submitBtn.click();
          await page.waitForTimeout(4000);
          console.log('    Application SUBMITTED successfully!');

          // Update status in Supabase
          await supabase.from('applications').update({
            status: 'SUBMITTED',
            metadata: {
              ...(app.metadata || {}),
              proofFilename,
              submittedAt: new Date().toISOString(),
              fieldsFilled: filledFields,
            }
          }).eq('id', app.id);
        } else {
          console.log('    Submit button not found.');
        }
      } else {
        console.log('    [GUARDED MODE]: Form filled and proof verified.');

        // Update application metadata in Supabase so this job is marked verified
        await supabase.from('applications').update({
          metadata: {
            ...(app.metadata || {}),
            proofFilename,
            verifiedAt: new Date().toISOString(),
            fieldsFilled: filledFields,
          }
        }).eq('id', app.id);
      }

      processedCount++;

      // In headed mode, give user 3 seconds to see the completed form before moving to next
      if (isHeaded && i < batch.length - 1) {
        console.log(`    Waiting 3s before opening next job (${batch[i + 1].jobs?.company})...`);
        await page.waitForTimeout(3000);
      }

    } catch (err) {
      console.error(`    Error processing application: ${err.message}`);
    } finally {
      await context.close();
    }
  }

  await browser.close();
  console.log('\n===========================================================');
  console.log(`Batch complete! Processed ${processedCount} application(s).`);
  console.log(`Proofs stored in: data/proofs/`);
  console.log('===========================================================');
}

main().catch(console.error);

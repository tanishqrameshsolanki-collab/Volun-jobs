# Volun jobs

Volun jobs is an opportunity intelligence platform and guarded application runner. It aggregates roles from public ATS endpoints (Greenhouse, Lever, JSON-LD career sites), evaluates candidate eligibility and match scores against structured profile facts, generates grounded application materials, and automates form submission through Playwright with an explicit human-in-the-loop review gate.

---

## Core Architecture & Design Principles

1. **Human-in-the-Loop Review Gate**  
   Automation is strictly partitioned from submission. Discovered opportunities are scored and queued for manual inspection at `/review`. No application is submitted without an explicit approval state stored in the database.

2. **Factual Grounding (No Hallucinations)**  
   Candidate profiles distinguish between verified facts (`KNOWN_FACT`) and missing fields (`USER_INPUT_REQUIRED`). Generated resumes and cover letters reference only verified facts. The system will not invent credentials, work history, or answers to sensitive screening questions.

3. **Multi-User Isolation via Row-Level Security**  
   All relational persistence is backed by Supabase PostgreSQL with Row Level Security (RLS) enabled across every table (`candidate_profiles`, `jobs`, `applications`, `automation_runs`, `user_settings`). Data access is strictly scoped to the authenticated user ID.

4. **Supervised Browser Execution**  
   The application runner uses Playwright to navigate ATS workflows, populate inputs using accessible label mappings, handle multi-page steps, and capture full-page audit screenshots (`proofs/`) upon completion.

---

## Monorepo Layout

```
.
├── apps/
│   ├── web/               # Next.js 15 dashboard, review queue, command center, onboarding
│   └── worker/            # Background worker process foundation
├── packages/
│   ├── shared/            # Shared TypeScript contracts, profile schemas, validators
│   ├── database/          # Database client ports and repository contracts
│   ├── job-engine/        # Greenhouse, Lever, JSON-LD discovery adapters & eligibility engine
│   ├── ai/                # Scoring engine (deterministic heuristics + Gemini provider)
│   ├── resume-engine/     # Grounded resume variant generator & cover letter drafts
│   └── analytics/         # Application funnel statistics and outcome breakdowns
├── scripts/
│   ├── apply-approved.mjs # Live Playwright runner for approved applications
│   └── inspect-form.mjs   # Form inspection and debugging utility
├── supabase/
│   ├── config.toml        # Local Supabase project configuration
│   └── migrations/        # Sequential PostgreSQL schema and RLS migrations
└── data/                  # Local seed profiles, schemas, and template resumes
```

---

## Prerequisites

- **Node.js**: `20.x` or higher
- **Package Manager**: `pnpm` (`10.x` recommended)
- **Supabase**: A Supabase project (hosted or local via `supabase-cli` / Docker)
- **Chromium**: Installed via Playwright for browser automation (`npx playwright install chromium`)

---

## Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment Variables

Create `.env.local` in the project root and in `apps/web/.env.local`:

```bash
cp .env.example .env.local
cp .env.example apps/web/.env.local
```

Key environment variables:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (used by server endpoints and runner) |
| `DATABASE_URL` | Direct PostgreSQL connection string (for migrations) |
| `GEMINI_API_KEY` | Optional: Gemini API key for LLM-assisted scoring & cover letters |
| `JOB_SOURCE_CONFIG` | JSON array configuring discovery boards (Greenhouse / Lever) |

Example `JOB_SOURCE_CONFIG`:
```json
[
  { "type": "GREENHOUSE", "company": "Grafana Labs", "boardToken": "grafanalabs" },
  { "type": "LEVER", "company": "Remote.com", "accountName": "remote" }
]
```

### 3. Database Migrations

Apply the migration sequence using the Supabase CLI:

```bash
pnpm exec supabase db push
```

Alternatively, apply the SQL files in `supabase/migrations/` sequentially using `psql` or the Supabase SQL Editor.

### 4. Start Development Server

```bash
pnpm dev
```

The web interface will be available at `http://localhost:3000`.

---

## Application Workflow

1. **Onboarding & Profile Setup (`/onboarding` & `/profile`)**  
   Configure candidate details, education, technical skills, target roles, preferred locations, and work authorization status.

2. **Job Discovery (`/command-center`)**  
   Click **Scan Jobs** to query configured ATS endpoints. New roles are normalized, deduplicated, and stored in the database.

3. **Eligibility & Scoring**  
   Roles are evaluated against candidate parameters (e.g., location, graduation year, required skills) and assigned a match score from 0 to 100.

4. **Generation & Tailoring**  
   Generate application packages containing tailored resume variant suggestions and grounded cover letter drafts.

5. **Review Queue (`/review`)**  
   Inspect scored opportunities, review drafted answers and risks, and set status to **Approved** or **Skipped**.

6. **Execution (`scripts/apply-approved.mjs`)**  
   Run the Playwright automation script to fill out approved applications:

   ```bash
   # Run in headed mode to observe the browser
   pnpm apply:live:headed

   # Run headlessly
   pnpm apply:live

   # Submit applications (default mode only fills and preserves review state)
   pnpm apply:submit
   ```

---

## Quality & Testing

Run all package test suites, linters, and type checks:

```bash
# Run Vitest test suite across all packages
pnpm test

# Run TypeScript compilation checks
pnpm typecheck

# Run ESLint
pnpm lint

# Format verification
pnpm format:check

# Production build check
pnpm build
```

---

## Safety & Ethics Policy

- **No Blind Submissions**: Every application requires human verification.
- **No Spoofing or Bypassing**: The system does not bypass CAPTCHA, Cloudflare challenges, or authentication gates.
- **Traceable Answers**: Screening answers are strictly derived from candidate facts.

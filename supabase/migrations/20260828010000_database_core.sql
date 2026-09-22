-- Phase 3: normalized database core for Supabase/PostgreSQL.
-- All timestamps are stored in UTC. JSONB is retained for source payloads and
-- generated artifacts so adapters can evolve without losing raw evidence.

alter table if exists candidate_profiles
  add column if not exists preferences jsonb not null default '{}'::jsonb,
  add column if not exists constraints jsonb not null default '{}'::jsonb;

create table if not exists skills (
  id uuid primary key default gen_random_uuid(),
  candidate_profile_id uuid not null references candidate_profiles(id) on delete cascade,
  category text not null,
  name text not null,
  created_at timestamptz not null default now(),
  unique (candidate_profile_id, category, name)
);

create table if not exists experiences (
  id uuid primary key default gen_random_uuid(),
  candidate_profile_id uuid not null references candidate_profiles(id) on delete cascade,
  title text not null,
  company text not null,
  location text,
  start_date date not null,
  end_date date,
  bullets jsonb not null default '[]'::jsonb,
  source text not null default 'resume',
  created_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  candidate_profile_id uuid not null references candidate_profiles(id) on delete cascade,
  name text not null,
  description text not null default '',
  project_date date,
  url text,
  bullets jsonb not null default '[]'::jsonb,
  source text not null default 'resume',
  created_at timestamptz not null default now()
);

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  normalized_name text not null unique,
  description text,
  product text,
  industry text,
  research jsonb,
  researched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table jobs
  add column if not exists company_id uuid references companies(id) on delete set null,
  add column if not exists normalized_url text,
  add column if not exists deadline timestamptz,
  add column if not exists graduation_requirements jsonb not null default '[]'::jsonb,
  add column if not exists degree_requirements jsonb not null default '[]'::jsonb,
  add column if not exists skills_required jsonb not null default '[]'::jsonb,
  add column if not exists skills_preferred jsonb not null default '[]'::jsonb,
  add column if not exists experience_required text,
  add column if not exists sponsorship_information text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists job_scores (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  candidate_profile_id uuid not null references candidate_profiles(id) on delete cascade,
  score integer not null check (score between 0 and 100),
  recommendation text not null check (recommendation in ('STRONG_APPLY', 'APPLY', 'REVIEW', 'LOW_PRIORITY', 'SKIP')),
  eligibility text not null check (eligibility in ('ELIGIBLE', 'LIKELY_ELIGIBLE', 'UNKNOWN', 'INELIGIBLE')),
  breakdown jsonb not null default '{}'::jsonb,
  strengths jsonb not null default '[]'::jsonb,
  missing_requirements jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  recommended_resume text,
  recommended_projects jsonb not null default '[]'::jsonb,
  model_metadata jsonb,
  created_at timestamptz not null default now(),
  unique (job_id, candidate_profile_id)
);

alter table applications
  add column if not exists candidate_profile_id uuid references candidate_profiles(id) on delete cascade,
  add column if not exists submitted_at timestamptz,
  add column if not exists last_error text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table applications drop constraint if exists applications_status_check;
alter table applications add constraint applications_status_check check (status in ('DISCOVERED', 'QUALIFIED', 'TAILORING', 'READY_FOR_REVIEW', 'APPROVED', 'APPLYING', 'SUBMITTED', 'OA', 'INTERVIEW', 'REJECTED', 'OFFER', 'WITHDRAWN', 'MANUAL_REQUIRED', 'ERROR'));

create table if not exists application_answers (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  question text not null,
  question_type text not null check (question_type in ('SAFE_AUTO_FILL', 'AI_GENERATE_REVIEW', 'HUMAN_REQUIRED')),
  answer text,
  source text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists resume_variants (
  id uuid primary key default gen_random_uuid(),
  candidate_profile_id uuid not null references candidate_profiles(id) on delete cascade,
  name text not null,
  target_role text,
  file_path text,
  content_hash text,
  source_master_hash text,
  diff jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (candidate_profile_id, name)
);

create table if not exists cover_letters (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  content text not null,
  prompt_version text,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists automation_runs (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references applications(id) on delete set null,
  status text not null check (status in ('RUNNING', 'COMPLETED', 'AUTOMATION_BLOCKED', 'FAILED')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  blocked_reason text,
  screenshot_path text,
  url text,
  last_successful_action text
);

create table if not exists automation_events (
  id uuid primary key default gen_random_uuid(),
  automation_run_id uuid not null references automation_runs(id) on delete cascade,
  event_type text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists application_state_transitions (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  from_status text,
  to_status text not null,
  transitioned_at timestamptz not null default now(),
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  check (from_status is null or from_status in ('DISCOVERED', 'QUALIFIED', 'TAILORING', 'READY_FOR_REVIEW', 'APPROVED', 'APPLYING', 'SUBMITTED', 'OA', 'INTERVIEW', 'REJECTED', 'OFFER', 'WITHDRAWN', 'MANUAL_REQUIRED', 'ERROR')),
  check (to_status in ('DISCOVERED', 'QUALIFIED', 'TAILORING', 'READY_FOR_REVIEW', 'APPROVED', 'APPLYING', 'SUBMITTED', 'OA', 'INTERVIEW', 'REJECTED', 'OFFER', 'WITHDRAWN', 'MANUAL_REQUIRED', 'ERROR'))
);

create table if not exists settings (
  id uuid primary key default gen_random_uuid(),
  candidate_profile_id uuid not null unique references candidate_profiles(id) on delete cascade,
  target_roles jsonb not null default '[]'::jsonb,
  target_companies jsonb not null default '[]'::jsonb,
  excluded_companies jsonb not null default '[]'::jsonb,
  preferred_locations jsonb not null default '[]'::jsonb,
  remote_preference text,
  minimum_match_score integer not null default 70 check (minimum_match_score between 0 and 100),
  maximum_applications_per_day integer not null default 3 check (maximum_applications_per_day > 0),
  resume_strategy text not null default 'ROLE_SPECIALIZED',
  auto_submit_preferences jsonb not null default '{}'::jsonb,
  ai_model_settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists skills_candidate_idx on skills(candidate_profile_id);
create index if not exists experiences_candidate_idx on experiences(candidate_profile_id);
create index if not exists projects_candidate_idx on projects(candidate_profile_id);
create index if not exists jobs_source_id_idx on jobs(source, source_job_id);
create unique index if not exists jobs_normalized_url_idx on jobs(normalized_url) where normalized_url is not null;
create index if not exists jobs_deadline_idx on jobs(deadline);
create index if not exists job_scores_candidate_score_idx on job_scores(candidate_profile_id, score desc);
create index if not exists application_answers_application_idx on application_answers(application_id);
create index if not exists resume_variants_candidate_idx on resume_variants(candidate_profile_id);
create index if not exists cover_letters_application_idx on cover_letters(application_id);
create index if not exists automation_runs_status_idx on automation_runs(status);
create index if not exists automation_events_run_created_idx on automation_events(automation_run_id, created_at);
create index if not exists application_state_transitions_application_idx on application_state_transitions(application_id, transitioned_at);

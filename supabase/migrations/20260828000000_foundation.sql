create extension if not exists pgcrypto;

create table if not exists candidate_profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  profile jsonb not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_job_id text,
  company text not null,
  title text not null,
  description text not null default '',
  location text,
  remote_policy text,
  employment_type text,
  application_url text not null,
  discovered_at timestamptz not null default now(),
  raw_description text,
  unique (source, source_job_id)
);

create index if not exists jobs_company_idx on jobs(company);
create index if not exists jobs_application_url_idx on jobs(application_url);

create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  status text not null default 'DISCOVERED',
  match_score integer,
  eligibility text,
  resume_variant text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id)
);

create index if not exists applications_status_idx on applications(status);
create index if not exists applications_match_score_idx on applications(match_score);

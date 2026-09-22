-- Multi-user platform schema enhancements
-- Adds onboarding completion tracking, notifications, and candidate resumes

-- 1. Onboarding status on candidate_profiles
alter table if exists candidate_profiles
  add column if not exists onboarding_completed boolean not null default false;

-- Backfill existing candidate profiles (e.g. Tanishq) as onboarded
update candidate_profiles
  set onboarding_completed = true
  where onboarding_completed = false;

-- Ensure foreign key constraint from candidate_profiles.owner_id to auth.users(id)
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'candidate_profiles_owner_id_fkey'
      and table_name = 'candidate_profiles'
  ) then
    alter table candidate_profiles
      add constraint candidate_profiles_owner_id_fkey
      foreign key (owner_id) references auth.users(id) on delete cascade;
  end if;
exception
  when others then null;
end $$;

-- 2. User Notifications table
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  candidate_profile_id uuid not null references candidate_profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'INFO',
  read boolean not null default false,
  link text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists notifications_candidate_idx on notifications(candidate_profile_id, created_at desc);

alter table notifications enable row level security;

do $$
begin
  drop policy if exists notifications_owner on notifications;
  create policy notifications_owner on notifications
    for all to authenticated
    using (
      exists (
        select 1 from candidate_profiles p
        where p.id = notifications.candidate_profile_id
          and p.owner_id = auth.uid()
      )
    )
    with check (
      exists (
        select 1 from candidate_profiles p
        where p.id = notifications.candidate_profile_id
          and p.owner_id = auth.uid()
      )
    );
exception
  when others then null;
end $$;

-- 3. Candidate Resumes table
create table if not exists resumes (
  id uuid primary key default gen_random_uuid(),
  candidate_profile_id uuid not null references candidate_profiles(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_size integer,
  mime_type text,
  parsed_text text,
  is_master boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists resumes_candidate_idx on resumes(candidate_profile_id);

alter table resumes enable row level security;

do $$
begin
  drop policy if exists resumes_owner on resumes;
  create policy resumes_owner on resumes
    for all to authenticated
    using (
      exists (
        select 1 from candidate_profiles p
        where p.id = resumes.candidate_profile_id
          and p.owner_id = auth.uid()
      )
    )
    with check (
      exists (
        select 1 from candidate_profiles p
        where p.id = resumes.candidate_profile_id
          and p.owner_id = auth.uid()
      )
    );
exception
  when others then null;
end $$;

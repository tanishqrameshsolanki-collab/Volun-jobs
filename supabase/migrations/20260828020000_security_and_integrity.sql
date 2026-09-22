-- Phase 16: Supabase ownership, row-level security, and integrity repairs.
-- This migration targets Supabase because ownership policies use auth.uid().

alter table if exists candidate_profiles
  add column if not exists owner_id uuid;

create unique index if not exists candidate_profiles_owner_idx
  on candidate_profiles(owner_id)
  where owner_id is not null;

do $$
begin
  if to_regclass('public.settings') is not null
     and to_regclass('public.candidate_settings') is null then
    alter table public.settings rename to candidate_settings;
  end if;
end
$$;

alter table if exists applications
  drop constraint if exists applications_job_id_key;

create unique index if not exists applications_candidate_job_idx
  on applications(candidate_profile_id, job_id)
  where candidate_profile_id is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists candidate_profiles_set_updated_at on candidate_profiles;
create trigger candidate_profiles_set_updated_at
before update on candidate_profiles
for each row execute function public.set_updated_at();

drop trigger if exists companies_set_updated_at on companies;
create trigger companies_set_updated_at
before update on companies
for each row execute function public.set_updated_at();

drop trigger if exists applications_set_updated_at on applications;
create trigger applications_set_updated_at
before update on applications
for each row execute function public.set_updated_at();

drop trigger if exists application_answers_set_updated_at on application_answers;
create trigger application_answers_set_updated_at
before update on application_answers
for each row execute function public.set_updated_at();

drop trigger if exists candidate_settings_set_updated_at on candidate_settings;
create trigger candidate_settings_set_updated_at
before update on candidate_settings
for each row execute function public.set_updated_at();

alter table candidate_profiles enable row level security;
alter table skills enable row level security;
alter table experiences enable row level security;
alter table projects enable row level security;
alter table companies enable row level security;
alter table jobs enable row level security;
alter table job_scores enable row level security;
alter table applications enable row level security;
alter table application_answers enable row level security;
alter table resume_variants enable row level security;
alter table cover_letters enable row level security;
alter table automation_runs enable row level security;
alter table automation_events enable row level security;
alter table application_state_transitions enable row level security;
alter table candidate_settings enable row level security;

drop policy if exists candidate_profiles_owner on candidate_profiles;
create policy candidate_profiles_owner on candidate_profiles
for all to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists skills_owner on skills;
create policy skills_owner on skills
for all to authenticated
using (exists (select 1 from candidate_profiles p where p.id = skills.candidate_profile_id and p.owner_id = auth.uid()))
with check (exists (select 1 from candidate_profiles p where p.id = skills.candidate_profile_id and p.owner_id = auth.uid()));

drop policy if exists experiences_owner on experiences;
create policy experiences_owner on experiences
for all to authenticated
using (exists (select 1 from candidate_profiles p where p.id = experiences.candidate_profile_id and p.owner_id = auth.uid()))
with check (exists (select 1 from candidate_profiles p where p.id = experiences.candidate_profile_id and p.owner_id = auth.uid()));

drop policy if exists projects_owner on projects;
create policy projects_owner on projects
for all to authenticated
using (exists (select 1 from candidate_profiles p where p.id = projects.candidate_profile_id and p.owner_id = auth.uid()))
with check (exists (select 1 from candidate_profiles p where p.id = projects.candidate_profile_id and p.owner_id = auth.uid()));

drop policy if exists companies_authenticated on companies;
create policy companies_authenticated on companies
for all to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

drop policy if exists jobs_authenticated on jobs;
create policy jobs_authenticated on jobs
for all to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

drop policy if exists job_scores_owner on job_scores;
create policy job_scores_owner on job_scores
for all to authenticated
using (exists (select 1 from candidate_profiles p where p.id = job_scores.candidate_profile_id and p.owner_id = auth.uid()))
with check (exists (select 1 from candidate_profiles p where p.id = job_scores.candidate_profile_id and p.owner_id = auth.uid()));

drop policy if exists applications_owner on applications;
create policy applications_owner on applications
for all to authenticated
using (exists (select 1 from candidate_profiles p where p.id = applications.candidate_profile_id and p.owner_id = auth.uid()))
with check (exists (select 1 from candidate_profiles p where p.id = applications.candidate_profile_id and p.owner_id = auth.uid()));

drop policy if exists application_answers_owner on application_answers;
create policy application_answers_owner on application_answers
for all to authenticated
using (exists (select 1 from applications a join candidate_profiles p on p.id = a.candidate_profile_id where a.id = application_answers.application_id and p.owner_id = auth.uid()))
with check (exists (select 1 from applications a join candidate_profiles p on p.id = a.candidate_profile_id where a.id = application_answers.application_id and p.owner_id = auth.uid()));

drop policy if exists resume_variants_owner on resume_variants;
create policy resume_variants_owner on resume_variants
for all to authenticated
using (exists (select 1 from candidate_profiles p where p.id = resume_variants.candidate_profile_id and p.owner_id = auth.uid()))
with check (exists (select 1 from candidate_profiles p where p.id = resume_variants.candidate_profile_id and p.owner_id = auth.uid()));

drop policy if exists cover_letters_owner on cover_letters;
create policy cover_letters_owner on cover_letters
for all to authenticated
using (exists (select 1 from applications a join candidate_profiles p on p.id = a.candidate_profile_id where a.id = cover_letters.application_id and p.owner_id = auth.uid()))
with check (exists (select 1 from applications a join candidate_profiles p on p.id = a.candidate_profile_id where a.id = cover_letters.application_id and p.owner_id = auth.uid()));

drop policy if exists automation_runs_owner on automation_runs;
create policy automation_runs_owner on automation_runs
for all to authenticated
using (exists (select 1 from applications a join candidate_profiles p on p.id = a.candidate_profile_id where a.id = automation_runs.application_id and p.owner_id = auth.uid()))
with check (exists (select 1 from applications a join candidate_profiles p on p.id = a.candidate_profile_id where a.id = automation_runs.application_id and p.owner_id = auth.uid()));

drop policy if exists automation_events_owner on automation_events;
create policy automation_events_owner on automation_events
for all to authenticated
using (exists (select 1 from automation_runs r join applications a on a.id = r.application_id join candidate_profiles p on p.id = a.candidate_profile_id where r.id = automation_events.automation_run_id and p.owner_id = auth.uid()))
with check (exists (select 1 from automation_runs r join applications a on a.id = r.application_id join candidate_profiles p on p.id = a.candidate_profile_id where r.id = automation_events.automation_run_id and p.owner_id = auth.uid()));

drop policy if exists application_state_transitions_owner on application_state_transitions;
create policy application_state_transitions_owner on application_state_transitions
for all to authenticated
using (exists (select 1 from applications a join candidate_profiles p on p.id = a.candidate_profile_id where a.id = application_state_transitions.application_id and p.owner_id = auth.uid()))
with check (exists (select 1 from applications a join candidate_profiles p on p.id = a.candidate_profile_id where a.id = application_state_transitions.application_id and p.owner_id = auth.uid()));

drop policy if exists candidate_settings_owner on candidate_settings;
create policy candidate_settings_owner on candidate_settings
for all to authenticated
using (exists (select 1 from candidate_profiles p where p.id = candidate_settings.candidate_profile_id and p.owner_id = auth.uid()))
with check (exists (select 1 from candidate_profiles p where p.id = candidate_settings.candidate_profile_id and p.owner_id = auth.uid()));

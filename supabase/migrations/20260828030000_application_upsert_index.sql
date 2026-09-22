-- Make the application conflict target inferable by PostgREST.
-- PostgreSQL partial indexes cannot be used by an ON CONFLICT target unless
-- the predicate is also supplied, which Supabase upsert does not do here.
drop index if exists applications_candidate_job_idx;

create unique index if not exists applications_candidate_job_idx
  on applications(candidate_profile_id, job_id);

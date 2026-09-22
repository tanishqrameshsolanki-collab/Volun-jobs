# Database package

The schema is kept in `supabase/migrations/`. The migrations are intended for the linked Supabase project; the security migration enables RLS and scopes candidate-owned records through `candidate_profiles.owner_id` and `auth.uid()`.

The runtime client/repository layer is still pending. Until it is added, the web app continues to use its local JSON stores.

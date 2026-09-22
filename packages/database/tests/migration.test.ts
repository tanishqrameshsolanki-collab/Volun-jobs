import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DATABASE_TABLES } from '../src/schema';

const migrationDirectory = path.resolve(
  process.cwd(),
  '../../supabase/migrations',
);
const sql = readFileSync(
  path.join(migrationDirectory, '20260828010000_database_core.sql'),
  'utf8',
);
const securitySql = readFileSync(
  path.join(migrationDirectory, '20260828020000_security_and_integrity.sql'),
  'utf8',
);
const applicationUpsertSql = readFileSync(
  path.join(migrationDirectory, '20260828030000_application_upsert_index.sql'),
  'utf8',
);
const skippedStateSql = readFileSync(
  path.join(migrationDirectory, '20260828040000_skipped_application_state.sql'),
  'utf8',
);
const multiUserSql = readFileSync(
  path.join(migrationDirectory, '20260828050000_multi_user_platform.sql'),
  'utf8',
);

describe('database foundation migration', () => {
  it('declares every required core table', () => {
    for (const table of DATABASE_TABLES.filter(
      (name) =>
        name !== 'candidate_profiles' &&
        name !== 'jobs' &&
        name !== 'applications' &&
        name !== 'candidate_settings' &&
        name !== 'notifications' &&
        name !== 'resumes',
    )) {
      expect(sql).toMatch(new RegExp(`create table if not exists ${table}`));
    }
  });

  it('includes indexes for lookup, ranking, and automation observability', () => {
    expect(sql).toContain('jobs_normalized_url_idx');
    expect(sql).toContain('job_scores_candidate_score_idx');
    expect(sql).toContain('automation_events_run_created_idx');
  });

  it('keeps application and eligibility states constrained', () => {
    expect(sql).toContain('applications_status_check');
    expect(sql).toContain(
      "eligibility in ('ELIGIBLE', 'LIKELY_ELIGIBLE', 'UNKNOWN', 'INELIGIBLE')",
    );
  });

  it('repairs ownership naming and duplicate application constraints', () => {
    expect(securitySql).toContain('candidate_settings');
    expect(securitySql).toContain('applications_candidate_job_idx');
    expect(securitySql).toContain('owner_id');
  });

  it('uses an inferable application upsert index', () => {
    expect(applicationUpsertSql).toContain(
      'on applications(candidate_profile_id, job_id)',
    );
    expect(applicationUpsertSql).not.toContain(
      'where candidate_profile_id is not null',
    );
  });

  it('keeps skipped applications out of applied outcomes', () => {
    expect(skippedStateSql).toContain("'SKIPPED'");
    expect(skippedStateSql).toContain('applications_status_check');
  });

  it('enables row-level security for private tables', () => {
    expect(securitySql).toContain(
      'alter table candidate_profiles enable row level security',
    );
    expect(securitySql).toContain('create policy applications_owner');
    expect(securitySql).toContain('create policy automation_events_owner');
  });

  it('declares multi-user tables and onboarding tracking', () => {
    expect(multiUserSql).toContain('onboarding_completed');
    expect(multiUserSql).toContain('create table if not exists notifications');
    expect(multiUserSql).toContain('create table if not exists resumes');
    expect(multiUserSql).toContain('create policy notifications_owner');
    expect(multiUserSql).toContain('create policy resumes_owner');
  });
});

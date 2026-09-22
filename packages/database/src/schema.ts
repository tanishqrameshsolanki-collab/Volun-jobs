export const DATABASE_TABLES = [
  'candidate_profiles',
  'skills',
  'experiences',
  'projects',
  'companies',
  'jobs',
  'job_scores',
  'applications',
  'application_answers',
  'resume_variants',
  'cover_letters',
  'automation_runs',
  'automation_events',
  'application_state_transitions',
  'candidate_settings',
  'notifications',
  'resumes',
] as const;

export type DatabaseTable = (typeof DATABASE_TABLES)[number];

export type ApplicationStatus =
  | 'DISCOVERED'
  | 'QUALIFIED'
  | 'TAILORING'
  | 'READY_FOR_REVIEW'
  | 'APPROVED'
  | 'APPLYING'
  | 'SUBMITTED'
  | 'OA'
  | 'INTERVIEW'
  | 'REJECTED'
  | 'OFFER'
  | 'WITHDRAWN'
  | 'SKIPPED'
  | 'MANUAL_REQUIRED'
  | 'ERROR';

export type EligibilityStatus =
  'ELIGIBLE' | 'LIKELY_ELIGIBLE' | 'UNKNOWN' | 'INELIGIBLE';

export type JobScoreRecord = {
  jobId: string;
  candidateProfileId: string;
  score: number;
  recommendation: 'STRONG_APPLY' | 'APPLY' | 'REVIEW' | 'LOW_PRIORITY' | 'SKIP';
  eligibility: EligibilityStatus;
  breakdown: Record<string, number>;
  strengths: string[];
  missingRequirements: string[];
  risks: string[];
  recommendedResume?: string;
  recommendedProjects: string[];
};

export type DatabasePort = {
  getCandidateProfile(profileId: string): Promise<unknown | null>;
  saveCandidateProfile(
    profile: unknown,
  ): Promise<{ id: string; version: number }>;
  listJobs(filters?: {
    status?: ApplicationStatus;
    minimumScore?: number;
  }): Promise<unknown[]>;
};

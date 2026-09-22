import type { CandidateProfile } from '@tanishq/shared';
import type { NormalizedJob } from '@tanishq/job-engine';

export type ResumeVariantName =
  'resume_ai' | 'resume_fullstack' | 'resume_graphics' | 'resume_backend';

export type TailoringProposal = {
  variant: ResumeVariantName;
  sourceMaster: string;
  selectedProjects: string[];
  prioritizedSkillGroups: string[];
  prioritizedExperienceBullets: number[];
  changes: Array<{
    section: 'PROJECTS' | 'SKILLS' | 'EXPERIENCE';
    action: 'REORDER' | 'EMPHASIZE';
    source: string;
    reason: string;
  }>;
};

export type ResumeValidation = { valid: boolean; issues: string[] };

export type ResumeSelectionRequest = {
  job: NormalizedJob;
  candidate: CandidateProfile;
};

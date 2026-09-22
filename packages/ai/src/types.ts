import type { CandidateProfile } from '@tanishq/shared';
import type { EligibilityResult, NormalizedJob } from '@tanishq/job-engine';

export const JOB_SCORING_V1 = 'JOB_SCORING_V1';

export type Recommendation =
  'STRONG_APPLY' | 'APPLY' | 'REVIEW' | 'LOW_PRIORITY' | 'SKIP';

export type JobScore = {
  score: number;
  recommendation: Recommendation;
  technicalFit: number;
  experienceFit: number;
  projectFit: number;
  eligibilityFit: number;
  roleFit: number;
  locationFit: number;
  companyQualityFit: number;
  strengths: string[];
  missingRequirements: string[];
  risks: string[];
  recommendedResume: string;
  recommendedProjects: string[];
  explanation: string;
};

export type ScoreRequest = {
  job: NormalizedJob;
  candidate: CandidateProfile;
  eligibility: EligibilityResult;
};

export type StructuredAiProvider = {
  generateJobScore(request: ScoreRequest, prompt: string): Promise<unknown>;
};

export type ScoreServiceResult =
  | { status: 'READY'; score: JobScore; cacheKey: string }
  | {
      status: 'MANUAL_REVIEW';
      reason: string;
      cacheKey: string;
      fallback: JobScore;
    };

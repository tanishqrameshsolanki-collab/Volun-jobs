import type { CandidateProfile } from '@tanishq/shared';
import type { NormalizedJob } from '@tanishq/job-engine';

export type QuestionType =
  'SAFE_AUTO_FILL' | 'AI_GENERATE_REVIEW' | 'HUMAN_REQUIRED';

export type ApplicationQuestion = {
  id: string;
  label: string;
  required?: boolean;
  options?: string[];
};

export type QuestionClassification = {
  type: QuestionType;
  reason: string;
};

export type AnswerDraft = {
  questionId: string;
  question: string;
  type: QuestionType;
  answer?: string;
  status: 'READY_TO_FILL' | 'REVIEW_REQUIRED' | 'ANSWER_REQUIRED';
  evidence: string[];
  reason: string;
};

export type AnswerContext = {
  question: ApplicationQuestion;
  candidate: CandidateProfile;
  job?: NormalizedJob;
};

import type { Page } from 'playwright';
import type { CandidateProfile } from '@tanishq/shared';

export type BrowserState =
  | 'OPEN_APPLICATION'
  | 'DETECT_FORM'
  | 'MAP_FIELDS'
  | 'FILL_KNOWN_FIELDS'
  | 'AUTOMATION_BLOCKED'
  | 'FINAL_REVIEW'
  | 'WAITING_FOR_APPROVAL'
  | 'SUBMITTING'
  | 'SUBMITTED'
  | 'ERROR';
export type BlockReason =
  | 'CAPTCHA'
  | 'AUTHENTICATION_REQUIRED'
  | 'HUMAN_REQUIRED'
  | 'UNKNOWN_FORM_FIELD'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'APPLICATION_UNAVAILABLE';

export type AutomationEvent = {
  state: BrowserState;
  message: string;
  timestamp: string;
  url?: string;
  metadata?: Record<string, unknown>;
};
export type AutomationRun = {
  state: BrowserState;
  events: AutomationEvent[];
  blockedReason?: BlockReason;
  lastSuccessfulAction?: string;
  screenshotPath?: string;
};
export type BrowserPolicy = {
  explicitApproval: boolean;
  permittedAutomation: boolean;
  allowSubmission: boolean;
};
export type ApplicationContext = {
  page: Page;
  candidate: CandidateProfile;
  resumePath?: string;
  policy: BrowserPolicy;
  onEvent?: (event: AutomationEvent) => void;
};
export type FieldName =
  | 'firstName'
  | 'lastName'
  | 'fullName'
  | 'email'
  | 'phone'
  | 'location'
  | 'linkedin'
  | 'github'
  | 'portfolio'
  | 'resume';
export type FieldMap = Partial<
  Record<FieldName, { label: string; kind: 'input' | 'file' }>
>;

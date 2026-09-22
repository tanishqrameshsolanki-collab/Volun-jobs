import type { ApplicationStatus } from '@tanishq/database';

export type StateTransition = {
  from: ApplicationStatus | null;
  to: ApplicationStatus;
  at: string;
  reason?: string;
  metadata?: Record<string, unknown>;
};

export type TrackedApplication = {
  id: string;
  jobId: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  history: StateTransition[];
};

export const VALID_APPLICATION_TRANSITIONS: Record<
  ApplicationStatus,
  ApplicationStatus[]
> = {
  DISCOVERED: ['QUALIFIED', 'MANUAL_REQUIRED', 'ERROR'],
  QUALIFIED: ['TAILORING', 'READY_FOR_REVIEW', 'MANUAL_REQUIRED', 'ERROR'],
  TAILORING: ['READY_FOR_REVIEW', 'MANUAL_REQUIRED', 'ERROR'],
  READY_FOR_REVIEW: ['APPROVED', 'WITHDRAWN', 'SKIPPED', 'MANUAL_REQUIRED'],
  APPROVED: ['APPLYING', 'WITHDRAWN', 'ERROR'],
  APPLYING: ['SUBMITTED', 'MANUAL_REQUIRED', 'ERROR'],
  SUBMITTED: ['OA', 'INTERVIEW', 'REJECTED', 'OFFER', 'WITHDRAWN', 'ERROR'],
  OA: ['INTERVIEW', 'REJECTED', 'OFFER', 'WITHDRAWN', 'ERROR'],
  INTERVIEW: ['OFFER', 'REJECTED', 'WITHDRAWN'],
  REJECTED: [],
  OFFER: ['WITHDRAWN'],
  WITHDRAWN: [],
  SKIPPED: [],
  MANUAL_REQUIRED: [
    'QUALIFIED',
    'TAILORING',
    'READY_FOR_REVIEW',
    'APPLYING',
    'WITHDRAWN',
    'ERROR',
  ],
  ERROR: ['MANUAL_REQUIRED', 'WITHDRAWN'],
};

export function createTrackedApplication(
  id: string,
  jobId: string,
  at = new Date().toISOString(),
): TrackedApplication {
  return {
    id,
    jobId,
    status: 'DISCOVERED',
    createdAt: at,
    updatedAt: at,
    history: [
      {
        from: null,
        to: 'DISCOVERED',
        at,
        reason: 'Application record created',
      },
    ],
  };
}

export function transitionApplication(
  application: TrackedApplication,
  to: ApplicationStatus,
  options: {
    at?: string;
    reason?: string;
    metadata?: Record<string, unknown>;
  } = {},
): TrackedApplication {
  if (!VALID_APPLICATION_TRANSITIONS[application.status].includes(to))
    throw new Error(
      `Invalid application transition: ${application.status} -> ${to}`,
    );
  const at = options.at ?? new Date().toISOString();
  const transition: StateTransition = {
    from: application.status,
    to,
    at,
    reason: options.reason,
    metadata: options.metadata,
  };
  return {
    ...application,
    status: to,
    updatedAt: at,
    history: [...application.history, transition],
  };
}

export function assertApplicationHistoryConsistent(
  application: TrackedApplication,
): void {
  if (
    application.history.length === 0 ||
    application.history[0]?.from !== null ||
    application.history[0]?.to !== 'DISCOVERED'
  )
    throw new Error('Application history must begin at DISCOVERED');
  for (let index = 1; index < application.history.length; index += 1) {
    const previous = application.history[index - 1];
    const current = application.history[index];
    if (
      !previous ||
      !current ||
      current.from !== previous.to ||
      !VALID_APPLICATION_TRANSITIONS[current.from].includes(current.to)
    )
      throw new Error('Application history contains an invalid transition');
  }
  if (application.history.at(-1)?.to !== application.status)
    throw new Error('Application status does not match its last transition');
}

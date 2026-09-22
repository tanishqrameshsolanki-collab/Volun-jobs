import type { AnswerDraft } from './types';

export type ReviewDecision = 'APPROVE_AND_APPLY' | 'EDIT' | 'SKIP' | 'ASK_ME';
export type ReviewPacket = {
  applicationId: string;
  company: string;
  role: string;
  matchScore: number;
  eligibility: 'ELIGIBLE' | 'LIKELY_ELIGIBLE' | 'UNKNOWN' | 'INELIGIBLE';
  resumeVariant: string;
  coverLetter?: string;
  answers: AnswerDraft[];
  risks: string[];
  missingInformation: string[];
};

export type ApprovalEvaluation = {
  canApprove: boolean;
  blockers: string[];
  warnings: string[];
};
export type ApprovalResult =
  | { status: 'APPROVED'; applicationId: string }
  | { status: 'BLOCKED'; applicationId: string; blockers: string[] };

export function evaluateApproval(packet: ReviewPacket): ApprovalEvaluation {
  const blockers = [
    ...packet.answers
      .filter(
        (answer) =>
          answer.status === 'ANSWER_REQUIRED' ||
          answer.type === 'HUMAN_REQUIRED',
      )
      .map((answer) => `${answer.question}: candidate answer required`),
    ...(packet.eligibility === 'INELIGIBLE'
      ? ['Eligibility is INELIGIBLE']
      : []),
  ];
  const warnings = [
    ...packet.risks,
    ...(packet.eligibility === 'UNKNOWN'
      ? ['Eligibility is UNKNOWN and should be reviewed']
      : []),
  ];
  return { canApprove: blockers.length === 0, blockers, warnings };
}

export function approveApplication(
  packet: ReviewPacket,
  explicitUserApproval: boolean,
): ApprovalResult {
  const evaluation = evaluateApproval(packet);
  if (!explicitUserApproval || !evaluation.canApprove)
    return {
      status: 'BLOCKED',
      applicationId: packet.applicationId,
      blockers: [
        ...evaluation.blockers,
        ...(!explicitUserApproval
          ? ['Explicit user approval was not provided']
          : []),
      ],
    };
  return { status: 'APPROVED', applicationId: packet.applicationId };
}

export function canSubmitApprovedApplication(
  packet: ReviewPacket,
  explicitUserApproval: boolean,
  permittedAutomation: boolean,
): boolean {
  return (
    explicitUserApproval &&
    permittedAutomation &&
    approveApplication(packet, true).status === 'APPROVED'
  );
}

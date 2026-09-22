import { describe, expect, it } from 'vitest';
import {
  approveApplication,
  canSubmitApprovedApplication,
  evaluateApproval,
  type ReviewPacket,
} from '../src';

const packet = (overrides: Partial<ReviewPacket> = {}): ReviewPacket => ({
  applicationId: 'app-1',
  company: 'Example',
  role: 'AI Intern',
  matchScore: 88,
  eligibility: 'ELIGIBLE',
  resumeVariant: 'resume_ai',
  answers: [],
  risks: [],
  missingInformation: [],
  ...overrides,
});

describe('human approval gate', () => {
  it('requires explicit approval before an application can be approved', () => {
    expect(approveApplication(packet(), false)).toMatchObject({
      status: 'BLOCKED',
    });
    expect(approveApplication(packet(), true)).toMatchObject({
      status: 'APPROVED',
      applicationId: 'app-1',
    });
  });

  it('blocks sensitive and unresolved answer requirements', () => {
    const result = evaluateApproval(
      packet({
        answers: [
          {
            questionId: 'sponsor',
            question: 'Sponsorship?',
            type: 'HUMAN_REQUIRED',
            status: 'ANSWER_REQUIRED',
            evidence: [],
            reason: 'Sensitive',
          },
        ],
      }),
    );
    expect(result.canApprove).toBe(false);
    expect(result.blockers[0]).toContain('candidate answer required');
  });

  it('blocks clearly ineligible opportunities', () => {
    expect(
      approveApplication(packet({ eligibility: 'INELIGIBLE' }), true),
    ).toMatchObject({ status: 'BLOCKED' });
  });

  it('allows unknown eligibility only as a visible warning, not a silent rejection', () => {
    const result = evaluateApproval(packet({ eligibility: 'UNKNOWN' }));
    expect(result.canApprove).toBe(true);
    expect(result.warnings).toContain(
      'Eligibility is UNKNOWN and should be reviewed',
    );
  });

  it('requires a separately permitted automation workflow before submission', () => {
    expect(canSubmitApprovedApplication(packet(), true, false)).toBe(false);
    expect(canSubmitApprovedApplication(packet(), true, true)).toBe(true);
  });
});

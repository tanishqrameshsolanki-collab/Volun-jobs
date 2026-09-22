import { describe, expect, it } from 'vitest';
import profile from '../../../data/candidate/profile.json';
import {
  getProfileCompleteness,
  listUserInputRequired,
  validateCandidateProfile,
} from '../src/candidate';
import type { CandidateProfile } from '../src/candidate';

describe('candidate profile contract', () => {
  it('requires unknown sensitive facts to remain explicitly unresolved', () => {
    const profile: Pick<CandidateProfile, 'constraints'> = {
      constraints: { status: 'USER_INPUT_REQUIRED' },
    };
    expect(profile.constraints.status).toBe('USER_INPUT_REQUIRED');
  });

  it('accepts the resume-grounded profile and validates completeness', () => {
    const candidate = profile as CandidateProfile;
    expect(validateCandidateProfile(candidate)).toEqual([]);
    expect(getProfileCompleteness(candidate).issues).toEqual([]);
    expect(listUserInputRequired(candidate)).toEqual([]);
  });

  it('reports unresolved inputs when sensitive facts require user input', () => {
    const uncompleted: CandidateProfile = {
      ...(profile as CandidateProfile),
      links: [{ label: 'LinkedIn', status: 'USER_INPUT_REQUIRED' }],
      preferences: {
        ...(profile as CandidateProfile).preferences,
        status: 'USER_INPUT_REQUIRED',
      },
      constraints: {
        status: 'USER_INPUT_REQUIRED',
      },
    };
    expect(listUserInputRequired(uncompleted)).toEqual([
      'Professional links',
      'Job preferences',
      'Work authorization and sponsorship',
    ]);
  });

  it('rejects malformed profiles instead of allowing AI or UI guesses', () => {
    expect(validateCandidateProfile({ schemaVersion: 99 })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'schemaVersion' }),
        expect.objectContaining({ path: 'personalInformation' }),
      ]),
    );
  });

  it('rejects malformed nested records and unsafe URLs', () => {
    const invalid = {
      ...profile,
      personalInformation: {
        ...profile.personalInformation,
        email: 'not-an-email',
      },
      links: [
        { label: 'GitHub', url: 'javascript:alert(1)', status: 'KNOWN_FACT' },
      ],
    };
    const issues = validateCandidateProfile(invalid);
    expect(issues.map((issue) => issue.path)).toEqual(
      expect.arrayContaining(['personalInformation.email', 'links.0.url']),
    );
  });

  it('rejects missing nested required fields instead of accepting a shallow shape', () => {
    const invalid = {
      ...profile,
      education: [
        {
          institution: '',
          degree: 'B.Sc.',
          expectedGraduationYear: 2029,
          relevantCoursework: [],
          status: 'KNOWN_FACT',
        },
      ],
    };
    expect(validateCandidateProfile(invalid)).toEqual(
      expect.arrayContaining([
        {
          path: 'education.0.institution',
          message: 'A non-empty string is required',
        },
      ]),
    );
  });
});

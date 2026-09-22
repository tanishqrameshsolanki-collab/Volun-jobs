import type { CandidateProfile } from '@tanishq/shared';
import type { EligibilityStatus, NormalizedJob } from './types';

export type EligibilityCheckStatus = 'PASS' | 'FAIL' | 'UNKNOWN';

export type EligibilityCheck = {
  name: string;
  status: EligibilityCheckStatus;
  detail: string;
};

export type EligibilityResult = {
  status: EligibilityStatus;
  confidence: number;
  checks: EligibilityCheck[];
  unknowns: string[];
  blockers: string[];
};

export type EligibilityOptions = { evaluatedAt?: Date };

const text = (value: string | undefined) => (value ?? '').toLowerCase();
const joinedJobText = (job: NormalizedJob) =>
  [
    job.title,
    job.description,
    job.graduationRequirements.join(' '),
    job.degreeRequirements.join(' '),
    job.experienceRequired,
    job.sponsorshipInformation,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

function checkGraduation(
  job: NormalizedJob,
  candidate: CandidateProfile,
): EligibilityCheck {
  const expectedYear = candidate.education[0]?.expectedGraduationYear;
  if (!expectedYear)
    return {
      name: 'graduation',
      status: 'UNKNOWN',
      detail: 'Candidate graduation year is not stored',
    };
  const requirements = [
    job.graduationRequirements.join(' '),
    joinedJobText(job),
  ].join(' ');
  const yearMatches = [
    ...requirements.matchAll(
      /(?:class of|graduat(?:e|ing|ion)|cohort)[^0-9]{0,30}(20\d{2})/gi,
    ),
  ];
  const years = yearMatches.map((match) => Number(match[1]));
  if (years.length === 0)
    return {
      name: 'graduation',
      status: 'PASS',
      detail: `No conflicting graduation year found; candidate graduates in ${expectedYear}`,
    };
  if (
    yearMatches.some((match) => {
      const year = Number(match[1]);
      const start = Math.max(0, (match.index ?? 0) - 32);
      const context = requirements.slice(
        start,
        (match.index ?? 0) + match[0].length + 32,
      );
      const requiresEarlier =
        /(?:by|before|prior to|no later than)\D{0,30}20\d{2}|20\d{2}\D{0,20}(?:or earlier|or before)/i.test(
          context,
        );
      const requiresLater =
        /20\d{2}\D{0,20}(?:or later|or after|onward)|(?:after|later than)\D{0,30}20\d{2}/i.test(
          context,
        );
      return requiresEarlier
        ? expectedYear > year
        : requiresLater
          ? expectedYear < year
          : expectedYear !== year;
    })
  )
    return {
      name: 'graduation',
      status: 'FAIL',
      detail: `Role graduation requirement conflicts with candidate graduation in ${expectedYear}`,
    };
  return {
    name: 'graduation',
    status: 'PASS',
    detail: `Candidate graduation year ${expectedYear} satisfies stated threshold`,
  };
}

function checkDegree(
  job: NormalizedJob,
  candidate: CandidateProfile,
): EligibilityCheck {
  const degree = text(candidate.education[0]?.degree);
  const requirements = [...job.degreeRequirements, joinedJobText(job)]
    .join(' ')
    .toLowerCase();
  if (
    !job.degreeRequirements.length &&
    !/(bachelor|degree|b\.s|b\.sc|computer science|information technology|engineering degree|engineering discipline)/i.test(
      requirements,
    )
  )
    return {
      name: 'degree',
      status: 'PASS',
      detail: 'No degree restriction found',
    };
  const allowsRelatedTechnicalField =
    /(related field|related technical field|technical field|equivalent)/i.test(
      requirements,
    );
  if (
    degree.includes('information technology') &&
    (allowsRelatedTechnicalField ||
      /information technology/i.test(requirements))
  )
    return {
      name: 'degree',
      status: 'PASS',
      detail:
        'Information Technology degree matches a technical or related-field requirement',
    };
  if (/(any major|any degree|student|currently pursuing)/i.test(requirements))
    return {
      name: 'degree',
      status: 'PASS',
      detail: 'Role accepts students or any degree',
    };
  if (job.degreeRequirements.length === 0)
    return {
      name: 'degree',
      status: 'UNKNOWN',
      detail: 'Degree language is present but the accepted field is ambiguous',
    };
  return {
    name: 'degree',
    status: 'UNKNOWN',
    detail:
      'The role has an explicit degree requirement that needs human confirmation',
  };
}

function checkRoleType(
  job: NormalizedJob,
  candidate: CandidateProfile,
): EligibilityCheck {
  const title = job.title.toLowerCase();
  const isExcludedFunction =
    /\b(counsel|legal|attorney|lawyer|compliance|paralegal|accountant|accounting|financial|finance|audit|auditor|tax|sales|account executive|business development|collections|customer support|customer success|recruiter|recruitment|talent|hr|human resources|people|marketing|growth|video editor|writer|copywriter|procurement|sourcing)\b/i.test(
      title,
    );
  if (isExcludedFunction) {
    return {
      name: 'role_type',
      status: 'FAIL',
      detail: `Role "${job.title}" is non-technical / outside candidate target functions`,
    };
  }

  if (job.internshipOrFullTime === 'INTERNSHIP') {
    const year = candidate.education[0]?.expectedGraduationYear;
    return year && year >= new Date().getFullYear()
      ? {
          name: 'student_status',
          status: 'PASS',
          detail: 'Expected graduation indicates current student status',
        }
      : {
          name: 'student_status',
          status: 'UNKNOWN',
          detail: 'Current student status is not confirmed',
        };
  }
  return {
    name: 'role_type',
    status: 'PASS',
    detail: `Role classified as ${job.internshipOrFullTime ?? 'unknown'}; technical engineering role matches candidate`,
  };
}

const FOREIGN_RESTRICTION_REGEX =
  /\b(united states|u\.s\.?a?|usa|us|canada|united kingdom|u\.k\.?|uk|ireland|germany|france|australia|israel|europe|emea|latam|japan|singapore|netherlands|sweden|stockholm|denmark|switzerland|brazil|mexico|poland|spain|italy|california|new york|texas|ontario|toronto|london|berlin|paris|sydney|melbourne|chicago|seattle|austin|san francisco)\b/i;

function checkSeniority(job: NormalizedJob): EligibilityCheck {
  const title = job.title.toLowerCase();
  const isExcluded =
    /\b(staff|principal|director|head of|vp|vice president|chief|partner|managing director|senior director)\b/i.test(
      title,
    );
  if (isExcluded) {
    return {
      name: 'seniority',
      status: 'FAIL',
      detail: `Role title "${job.title}" is executive or staff/principal level; exceeds candidate early-career profile`,
    };
  }
  return {
    name: 'seniority',
    status: 'PASS',
    detail: `Role seniority "${job.title}" is suitable for candidate profile`,
  };
}

function checkLocation(
  job: NormalizedJob,
  candidate: CandidateProfile,
): EligibilityCheck {
  if (!job.location) {
    return {
      name: 'location',
      status: 'PASS',
      detail: 'Remote or unspecified location does not conflict with the stored profile',
    };
  }

  const loc = `${job.location} ${job.remotePolicy ?? ''}`.toLowerCase();

  // 1. Mumbai (or MMR) is candidate's home base: matches hybrid, on-site, or remote
  if (/\b(mumbai|bombay|navi mumbai|thane)\b/i.test(loc)) {
    return {
      name: 'location',
      status: 'PASS',
      detail: `Role location in Mumbai (${job.location ?? 'Mumbai'}) supports on-site or hybrid preference`,
    };
  }

  // 2. Remote check
  const isRemote = /\b(remote|telecommute|work from home|anywhere|virtual)\b/i.test(loc);
  if (isRemote) {
    const isIndiaAllowed = /\b(india|apac|worldwide|global|anywhere)\b/i.test(loc);
    const isForeignRestricted = FOREIGN_RESTRICTION_REGEX.test(loc) && !isIndiaAllowed;
    if (isForeignRestricted) {
      return {
        name: 'location',
        status: 'FAIL',
        detail: `Role is remote but restricted to foreign jurisdiction (${job.location}); candidate is based in India`,
      };
    }
    return {
      name: 'location',
      status: 'PASS',
      detail: `Role is remote (${job.location || 'remote'}), matching worldwide remote preference`,
    };
  }

  // 3. Indian locations (outside Mumbai)
  const isIndianCity = /\b(india|bengaluru|bangalore|delhi|ncr|gurgaon|gurugram|noida|hyderabad|pune|chennai|kolkata|ahmedabad)\b/i.test(loc);
  if (isIndianCity) {
    return {
      name: 'location',
      status: 'UNKNOWN',
      detail: `Role is listed in ${job.location}; relocation or remote flexibility is not confirmed`,
    };
  }

  // 4. Foreign on-site location (e.g. San Francisco, London, Berlin, Austin, etc.)
  if (job.location) {
    return {
      name: 'location',
      status: 'FAIL',
      detail: `Role requires foreign on-site attendance in ${job.location}; candidate requires Worldwide remote or Mumbai hybrid`,
    };
  }

  return {
    name: 'location',
    status: 'UNKNOWN',
    detail: 'Location is unspecified; requires verification',
  };
}

function checkAuthorization(
  job: NormalizedJob,
  candidate: CandidateProfile,
): EligibilityCheck {
  const requirement = [job.sponsorshipInformation, joinedJobText(job)]
    .filter(Boolean)
    .join(' ');
  if (
    !/(visa|sponsor|sponsorship|work authorization|citizenship|citizen|authori[sz]ed to work)/i.test(
      requirement,
    )
  )
    return {
      name: 'authorization',
      status: 'PASS',
      detail: 'No work authorization or sponsorship restriction is stated',
    };
  const stored =
    `${candidate.constraints.workAuthorization ?? ''} ${candidate.constraints.sponsorship ?? ''}`.trim();
  if (!stored)
    return {
      name: 'authorization',
      status: 'UNKNOWN',
      detail:
        'Role mentions authorization or sponsorship, but candidate response is required',
    };
  return {
    name: 'authorization',
    status: 'UNKNOWN',
    detail:
      'Authorization language requires a candidate-confirmed answer before applying',
  };
}

function checkDeadline(
  job: NormalizedJob,
  evaluatedAt: Date,
): EligibilityCheck {
  if (!job.deadline)
    return {
      name: 'deadline',
      status: 'PASS',
      detail: 'No deadline is available',
    };
  const deadline = new Date(job.deadline);
  if (Number.isNaN(deadline.valueOf()))
    return {
      name: 'deadline',
      status: 'UNKNOWN',
      detail: 'Deadline could not be parsed',
    };
  return deadline < evaluatedAt
    ? {
        name: 'deadline',
        status: 'FAIL',
        detail: 'Application deadline has passed',
      }
    : {
        name: 'deadline',
        status: 'PASS',
        detail: 'Application deadline is open',
      };
}

export function evaluateEligibility(
  job: NormalizedJob,
  candidate: CandidateProfile,
  options: EligibilityOptions = {},
): EligibilityResult {
  const checks = [
    checkGraduation(job, candidate),
    checkDegree(job, candidate),
    checkRoleType(job, candidate),
    checkSeniority(job),
    checkLocation(job, candidate),
    checkAuthorization(job, candidate),
    checkDeadline(job, options.evaluatedAt ?? new Date()),
  ];
  const blockers = checks
    .filter((check) => check.status === 'FAIL')
    .map((check) => check.detail);
  const unknowns = checks
    .filter((check) => check.status === 'UNKNOWN')
    .map((check) => check.detail);
  const criticalUnknowns = checks.filter(
    (check) =>
      check.status === 'UNKNOWN' &&
      ['authorization', 'degree', 'student_status'].includes(check.name),
  );
  const status: EligibilityStatus =
    blockers.length > 0
      ? 'INELIGIBLE'
      : criticalUnknowns.length > 0
        ? 'UNKNOWN'
        : unknowns.length > 0
          ? 'LIKELY_ELIGIBLE'
          : 'ELIGIBLE';
  const confidence =
    status === 'ELIGIBLE' || status === 'INELIGIBLE'
      ? 1
      : Math.max(0.25, 1 - unknowns.length / checks.length);
  return { status, confidence, checks, unknowns, blockers };
}

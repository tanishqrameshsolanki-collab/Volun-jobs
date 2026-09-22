export type FactStatus = 'KNOWN_FACT' | 'USER_INPUT_REQUIRED';

export type CandidateLink = {
  label: string;
  url?: string;
  status: FactStatus;
};

export type CandidateProfile = {
  schemaVersion: 1;
  personalInformation: {
    fullName: string;
    location: string;
    email: string;
    phone: string;
    status: FactStatus;
  };
  education: Array<{
    institution: string;
    degree: string;
    expectedGraduationYear: number;
    relevantCoursework: string[];
    status: FactStatus;
  }>;
  experience: Array<{
    title: string;
    company: string;
    location: string;
    startDate: string;
    endDate?: string;
    bullets: string[];
    status: FactStatus;
  }>;
  projects: Array<{
    name: string;
    description: string;
    date: string;
    bullets: string[];
    url?: string;
    status: FactStatus;
  }>;
  skills: Record<string, string[]>;
  links: CandidateLink[];
  preferences: {
    targetRoles: string[];
    targetCompanies: string[];
    targetLocations: string[];
    remotePreference: 'PREFERRED' | 'NEUTRAL' | 'AVOID' | 'USER_INPUT_REQUIRED';
    status: FactStatus;
  };
  constraints: {
    workAuthorization?: string;
    sponsorship?: string;
    status: FactStatus;
  };
};

export type ProfileIssue = {
  path: string;
  message: string;
};

export type ProfileCompleteness = {
  knownFacts: number;
  userInputRequired: number;
  issues: ProfileIssue[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const MAX_TEXT_LENGTH = 4000;
const MAX_ARRAY_LENGTH = 200;
const factStatuses = new Set<FactStatus>(['KNOWN_FACT', 'USER_INPUT_REQUIRED']);
const remotePreferences = new Set<
  CandidateProfile['preferences']['remotePreference']
>(['PREFERRED', 'NEUTRAL', 'AVOID', 'USER_INPUT_REQUIRED']);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) &&
  value.length <= MAX_ARRAY_LENGTH &&
  value.every(
    (item) => typeof item === 'string' && item.length <= MAX_TEXT_LENGTH,
  );

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.trim().length > 0 &&
  value.length <= MAX_TEXT_LENGTH;

const isValidUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const isValidFactStatus = (value: unknown): value is FactStatus =>
  typeof value === 'string' && factStatuses.has(value as FactStatus);

function validateStringArray(
  value: unknown,
  path: string,
  issues: ProfileIssue[],
) {
  if (!Array.isArray(value)) {
    issues.push({ path, message: 'An array is required' });
    return;
  }
  if (value.length > MAX_ARRAY_LENGTH)
    issues.push({
      path,
      message: `At most ${MAX_ARRAY_LENGTH} items are allowed`,
    });
  value.forEach((item, index) => {
    if (!isNonEmptyString(item))
      issues.push({
        path: `${path}.${index}`,
        message: 'A non-empty string is required',
      });
  });
}

function validateFactStatus(
  value: unknown,
  path: string,
  issues: ProfileIssue[],
) {
  if (!isValidFactStatus(value))
    issues.push({ path, message: 'Invalid fact status' });
}

export function validateCandidateProfile(value: unknown): ProfileIssue[] {
  const issues: ProfileIssue[] = [];
  if (!isRecord(value))
    return [{ path: '', message: 'Profile must be an object' }];
  if (value.schemaVersion !== 1)
    issues.push({
      path: 'schemaVersion',
      message: 'Unsupported schema version',
    });

  const personal = value.personalInformation;
  if (!isRecord(personal))
    issues.push({
      path: 'personalInformation',
      message: 'Personal information is required',
    });
  else {
    for (const field of ['fullName', 'location', 'phone']) {
      if (!isNonEmptyString(personal[field]))
        issues.push({
          path: `personalInformation.${field}`,
          message: 'A non-empty string is required',
        });
    }
    if (
      !isNonEmptyString(personal.email) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personal.email)
    )
      issues.push({
        path: 'personalInformation.email',
        message: 'A valid email address is required',
      });
    validateFactStatus(personal.status, 'personalInformation.status', issues);
  }

  const education = value.education;
  if (!Array.isArray(education))
    issues.push({ path: 'education', message: 'An array is required' });
  else
    education.forEach((item, index) => {
      const path = `education.${index}`;
      if (!isRecord(item)) {
        issues.push({ path, message: 'Education entry must be an object' });
        return;
      }
      for (const field of ['institution', 'degree'])
        if (!isNonEmptyString(item[field]))
          issues.push({
            path: `${path}.${field}`,
            message: 'A non-empty string is required',
          });
      if (
        !Number.isInteger(item.expectedGraduationYear) ||
        (item.expectedGraduationYear as number) < 1900 ||
        (item.expectedGraduationYear as number) > 2200
      )
        issues.push({
          path: `${path}.expectedGraduationYear`,
          message: 'A valid graduation year is required',
        });
      validateStringArray(
        item.relevantCoursework,
        `${path}.relevantCoursework`,
        issues,
      );
      validateFactStatus(item.status, `${path}.status`, issues);
    });

  const experience = value.experience;
  if (!Array.isArray(experience))
    issues.push({ path: 'experience', message: 'An array is required' });
  else
    experience.forEach((item, index) => {
      const path = `experience.${index}`;
      if (!isRecord(item)) {
        issues.push({ path, message: 'Experience entry must be an object' });
        return;
      }
      for (const field of ['title', 'company', 'location', 'startDate'])
        if (!isNonEmptyString(item[field]))
          issues.push({
            path: `${path}.${field}`,
            message: 'A non-empty string is required',
          });
      if (item.endDate !== undefined && !isNonEmptyString(item.endDate))
        issues.push({
          path: `${path}.endDate`,
          message: 'End date must be a non-empty string when provided',
        });
      validateStringArray(item.bullets, `${path}.bullets`, issues);
      validateFactStatus(item.status, `${path}.status`, issues);
    });

  const projects = value.projects;
  if (!Array.isArray(projects))
    issues.push({ path: 'projects', message: 'An array is required' });
  else
    projects.forEach((item, index) => {
      const path = `projects.${index}`;
      if (!isRecord(item)) {
        issues.push({ path, message: 'Project entry must be an object' });
        return;
      }
      for (const field of ['name', 'description', 'date'])
        if (!isNonEmptyString(item[field]))
          issues.push({
            path: `${path}.${field}`,
            message: 'A non-empty string is required',
          });
      if (
        item.url !== undefined &&
        (!isNonEmptyString(item.url) || !isValidUrl(item.url))
      )
        issues.push({
          path: `${path}.url`,
          message: 'Project URL must be a valid HTTP(S) URL',
        });
      validateStringArray(item.bullets, `${path}.bullets`, issues);
      validateFactStatus(item.status, `${path}.status`, issues);
    });

  if (!isRecord(value.skills))
    issues.push({
      path: 'skills',
      message: 'Skills must be grouped by category',
    });
  else
    for (const [category, skills] of Object.entries(value.skills))
      if (
        !isStringArray(skills) ||
        skills.some((skill) => !isNonEmptyString(skill))
      )
        issues.push({
          path: `skills.${category}`,
          message: 'Skills must be non-empty strings',
        });

  const links = value.links;
  if (!Array.isArray(links))
    issues.push({ path: 'links', message: 'Links must be an array' });
  else
    links.forEach((item, index) => {
      const path = `links.${index}`;
      if (!isRecord(item)) {
        issues.push({ path, message: 'Link entry must be an object' });
        return;
      }
      if (!isNonEmptyString(item.label))
        issues.push({
          path: `${path}.label`,
          message: 'Link label is required',
        });
      if (
        item.url !== undefined &&
        (!isNonEmptyString(item.url) || !isValidUrl(item.url))
      )
        issues.push({
          path: `${path}.url`,
          message: 'Link URL must be a valid HTTP(S) URL',
        });
      validateFactStatus(item.status, `${path}.status`, issues);
    });

  const preferences = value.preferences;
  if (!isRecord(preferences))
    issues.push({ path: 'preferences', message: 'Preferences are required' });
  else {
    validateStringArray(
      preferences.targetRoles,
      'preferences.targetRoles',
      issues,
    );
    validateStringArray(
      preferences.targetCompanies,
      'preferences.targetCompanies',
      issues,
    );
    validateStringArray(
      preferences.targetLocations,
      'preferences.targetLocations',
      issues,
    );
    if (
      typeof preferences.remotePreference !== 'string' ||
      !remotePreferences.has(
        preferences.remotePreference as CandidateProfile['preferences']['remotePreference'],
      )
    )
      issues.push({
        path: 'preferences.remotePreference',
        message: 'Invalid remote preference',
      });
    validateFactStatus(preferences.status, 'preferences.status', issues);
  }

  const constraints = value.constraints;
  if (!isRecord(constraints))
    issues.push({ path: 'constraints', message: 'Constraints are required' });
  else {
    for (const field of ['workAuthorization', 'sponsorship'])
      if (
        constraints[field] !== undefined &&
        !isNonEmptyString(constraints[field])
      )
        issues.push({
          path: `constraints.${field}`,
          message: 'Constraint must be a non-empty string when provided',
        });
    validateFactStatus(constraints.status, 'constraints.status', issues);
  }
  return issues;
}

export function getProfileCompleteness(
  profile: CandidateProfile,
): ProfileCompleteness {
  const serialized = JSON.stringify(profile);
  const knownFacts = (serialized.match(/KNOWN_FACT/g) ?? []).length;
  const userInputRequired = (serialized.match(/USER_INPUT_REQUIRED/g) ?? [])
    .length;
  return {
    knownFacts,
    userInputRequired,
    issues: validateCandidateProfile(profile),
  };
}

export function listUserInputRequired(profile: CandidateProfile): string[] {
  const missing: string[] = [];
  if (profile.links.some((link) => link.status === 'USER_INPUT_REQUIRED'))
    missing.push('Professional links');
  if (profile.preferences.status === 'USER_INPUT_REQUIRED')
    missing.push('Job preferences');
  if (profile.constraints.status === 'USER_INPUT_REQUIRED')
    missing.push('Work authorization and sponsorship');
  return missing;
}

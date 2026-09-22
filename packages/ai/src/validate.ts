import type { JobScore, Recommendation } from './types';

const recommendations = new Set<Recommendation>([
  'STRONG_APPLY',
  'APPLY',
  'REVIEW',
  'LOW_PRIORITY',
  'SKIP',
]);
const resumeVariants = new Set([
  'resume_ai',
  'resume_fullstack',
  'resume_graphics',
  'resume_backend',
]);
const isNumber = (value: unknown) =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= 100;
const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

export function validateJobScore(
  value: unknown,
  options: { candidateProjectNames?: readonly string[] } = {},
): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return ['score must be an object'];
  const record = value as Record<string, unknown>;
  const issues: string[] = [];
  if (!isNumber(record.score)) issues.push('score must be 0-100');
  if (
    typeof record.recommendation !== 'string' ||
    !recommendations.has(record.recommendation as Recommendation)
  )
    issues.push('recommendation is invalid');
  for (const field of [
    'technicalFit',
    'experienceFit',
    'projectFit',
    'eligibilityFit',
    'roleFit',
    'locationFit',
    'companyQualityFit',
  ])
    if (!isNumber(record[field])) issues.push(`${field} must be 0-100`);
  for (const field of [
    'strengths',
    'missingRequirements',
    'risks',
    'recommendedProjects',
  ])
    if (!isStringArray(record[field]))
      issues.push(`${field} must be an array of strings`);
  if (
    typeof record.recommendedResume !== 'string' ||
    !resumeVariants.has(record.recommendedResume)
  )
    issues.push('recommendedResume must be a known resume variant');
  if (
    options.candidateProjectNames &&
    isStringArray(record.recommendedProjects)
  ) {
    const knownProjects = new Set(options.candidateProjectNames);
    for (const project of record.recommendedProjects)
      if (!knownProjects.has(project))
        issues.push(
          `recommendedProjects contains an unknown project: ${project}`,
        );
  }
  if (typeof record.explanation !== 'string')
    issues.push('explanation must be a string');
  return issues;
}

export function parseJobScore(
  value: unknown,
  options: { candidateProjectNames?: readonly string[] } = {},
): JobScore | null {
  return validateJobScore(value, options).length === 0
    ? (value as JobScore)
    : null;
}

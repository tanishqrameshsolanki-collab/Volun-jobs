import type { CandidateProfile } from '@tanishq/shared';
import type { EligibilityResult, NormalizedJob } from '@tanishq/job-engine';
import type { JobScore, Recommendation } from './types';

const words = (value: string) =>
  new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9+#.]+/)
      .filter((word) => word.length > 2),
  );
const candidateSkills = (candidate: CandidateProfile) =>
  new Set(
    Object.values(candidate.skills)
      .flat()
      .map((skill) => skill.toLowerCase()),
  );
const recommendationFor = (score: number): Recommendation =>
  score >= 90
    ? 'STRONG_APPLY'
    : score >= 80
      ? 'APPLY'
      : score >= 70
        ? 'REVIEW'
        : score >= 60
          ? 'LOW_PRIORITY'
          : 'SKIP';

function overlap(required: string[], candidate: Set<string>) {
  if (required.length === 0) return 70;
  const matches = required.filter(
    (item) =>
      candidate.has(item.toLowerCase()) ||
      [...candidate].some(
        (skill) =>
          skill.includes(item.toLowerCase()) ||
          item.toLowerCase().includes(skill),
      ),
  ).length;
  return Math.round((matches / required.length) * 100);
}

export function scoreJobDeterministically(
  job: NormalizedJob,
  candidate: CandidateProfile,
  eligibility: EligibilityResult,
): JobScore {
  const skillSet = candidateSkills(candidate);
  const jobWords = words(`${job.title} ${job.description}`);
  const technicalFit =
    overlap(job.skillsRequired, skillSet) * 0.7 +
    overlap(job.skillsPreferred, skillSet) * 0.3;
  const experienceText = candidate.experience
    .flatMap((item) => [item.title, ...item.bullets])
    .join(' ')
    .toLowerCase();
  const experienceFit = [...jobWords].filter((word) =>
    experienceText.includes(word),
  ).length
    ? Math.min(
        100,
        55 +
          [...jobWords].filter((word) => experienceText.includes(word)).length *
            5,
      )
    : 35;
  const projectSignals = candidate.projects.filter((project) =>
    [...jobWords].some((word) =>
      `${project.name} ${project.description} ${project.bullets.join(' ')}`
        .toLowerCase()
        .includes(word),
    ),
  );
  const projectFit = projectSignals.length
    ? Math.min(100, 60 + projectSignals.length * 15)
    : 30;
  const eligibilityFit =
    eligibility.status === 'ELIGIBLE'
      ? 100
      : eligibility.status === 'LIKELY_ELIGIBLE'
        ? 80
        : eligibility.status === 'UNKNOWN'
          ? 55
          : 0;
  const isEngineeringRole =
    /\b(software|engineer|developer|frontend|front-end|backend|back-end|fullstack|full-stack|web|webgl|graphics|ai|ml|data engineer|data scientist|data platform|programmer|sde|tech|systems|devops|cloud|infrastructure|qa|quality assurance|sre|reliability)\b/i.test(
      job.title,
    );
  const isExcludedFunction =
    /\b(counsel|legal|attorney|lawyer|compliance|paralegal|accountant|accounting|financial|finance|audit|auditor|tax|sales|account executive|business development|collections|customer support|customer success|recruiter|recruitment|talent|hr|human resources|people|marketing|growth|video editor|writer|copywriter|procurement|sourcing)\b/i.test(
      job.title,
    );

  const roleFit =
    !isEngineeringRole || isExcludedFunction
      ? 0
      : candidate.preferences.targetRoles.length === 0
        ? 60
        : candidate.preferences.targetRoles.some(
              (role) =>
                job.title.toLowerCase().includes(role.toLowerCase()) ||
                role.toLowerCase().includes(job.title.toLowerCase()),
            )
          ? 100
          : 45;
  const locationFit =
    !job.location || /remote/i.test(`${job.location} ${job.remotePolicy ?? ''}`)
      ? 100
      : candidate.preferences.targetLocations.some((location) =>
            job.location
              ?.toLowerCase()
              .includes(location.toLowerCase().split(',')[0] ?? ''),
          )
        ? 100
        : 40;
  const companyQualityFit = 50;
  let score = Math.round(
    technicalFit * 0.3 +
      experienceFit * 0.2 +
      projectFit * 0.15 +
      eligibilityFit * 0.15 +
      roleFit * 0.1 +
      locationFit * 0.05 +
      companyQualityFit * 0.05,
  );
  if (
    eligibility.status === 'INELIGIBLE' ||
    !isEngineeringRole ||
    isExcludedFunction
  ) {
    score = Math.min(score, 20);
  }
  const strengths = [...job.skillsRequired].filter((skill) =>
    skillSet.has(skill.toLowerCase()),
  );
  const missingRequirements = [...job.skillsRequired].filter(
    (skill) => !strengths.includes(skill),
  );
  const risks = [...eligibility.unknowns];
  if (companyQualityFit === 50)
    risks.push('Company quality has not been researched yet');
  const recommendedResume = /ai|machine learning|llm|generative/i.test(
    job.title,
  )
    ? 'resume_ai'
    : /webgl|3d|graphics|shader/i.test(`${job.title} ${job.description}`)
      ? 'resume_graphics'
      : /backend|api|infrastructure/i.test(job.title)
        ? 'resume_backend'
        : 'resume_fullstack';
  return {
    score,
    recommendation: recommendationFor(score),
    technicalFit: Math.round(technicalFit),
    experienceFit,
    projectFit,
    eligibilityFit,
    roleFit,
    locationFit,
    companyQualityFit,
    strengths,
    missingRequirements,
    risks,
    recommendedResume,
    recommendedProjects: projectSignals.map((project) => project.name),
    explanation: `Scored on technical overlap, relevant experience, project evidence, eligibility, role alignment, location, and currently unresearched company quality.`,
  };
}

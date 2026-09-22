import type { CandidateProfile } from '@tanishq/shared';
import type { NormalizedJob } from '@tanishq/job-engine';
import type {
  ResumeSelectionRequest,
  ResumeVariantName,
  TailoringProposal,
} from './types';

const jobText = (job: NormalizedJob) =>
  `${job.title} ${job.description}`.toLowerCase();

export function selectResumeVariant({
  job,
}: ResumeSelectionRequest): ResumeVariantName {
  const text = jobText(job);
  if (
    /ai|machine learning|llm|generative|model|retrieval|vector|langchain/i.test(
      text,
    )
  )
    return 'resume_ai';
  if (
    /webgl|three\.js|3d|graphics|shader|rendering|creative technology/i.test(
      text,
    )
  )
    return 'resume_graphics';
  if (/backend|api|infrastructure|developer tools|platform/i.test(text))
    return 'resume_backend';
  return 'resume_fullstack';
}

export function buildTailoringProposal({
  job,
  candidate,
}: ResumeSelectionRequest): TailoringProposal {
  const variant = selectResumeVariant({ job, candidate });
  const selectedProjects =
    variant === 'resume_ai'
      ? ['DAWN', 'Stranded-Music']
      : variant === 'resume_graphics'
        ? ['Stranded-Music', 'DAWN']
        : ['Stranded-Music', 'DAWN'];
  const prioritizedSkillGroups =
    variant === 'resume_ai'
      ? ['dataAndAI', 'languages', 'frontend']
      : variant === 'resume_graphics'
        ? ['threeDAndWebGL', 'languages', 'frontend']
        : variant === 'resume_backend'
          ? ['backendAndCloud', 'languages', 'dataAndAI']
          : ['frontend', 'backendAndCloud', 'languages'];
  const experienceBullets = candidate.experience[0]?.bullets ?? [];
  const prioritizedExperienceBullets =
    variant === 'resume_graphics'
      ? experienceBullets.map((_, index) => index).filter((index) => index < 5)
      : variant === 'resume_ai'
        ? experienceBullets
            .map((_, index) => index)
            .filter((index) => index === 0 || index === 5)
        : experienceBullets
            .map((_, index) => index)
            .filter((index) => index < experienceBullets.length);
  return {
    variant,
    sourceMaster: 'data/resumes/resume_master.docx',
    selectedProjects: selectedProjects.filter((name) =>
      candidate.projects.some((project) => project.name === name),
    ),
    prioritizedSkillGroups: prioritizedSkillGroups.filter((group) =>
      Object.hasOwn(candidate.skills, group),
    ),
    prioritizedExperienceBullets,
    changes: [
      {
        section: 'PROJECTS',
        action: 'REORDER',
        source: selectedProjects.join(', '),
        reason: 'Put the most relevant verified projects first for this role.',
      },
      {
        section: 'SKILLS',
        action: 'REORDER',
        source: prioritizedSkillGroups.join(', '),
        reason:
          'Prioritize existing skill groups that match the role language.',
      },
      {
        section: 'EXPERIENCE',
        action: 'EMPHASIZE',
        source: prioritizedExperienceBullets
          .map((index) => `Mira3D bullet ${index + 1}`)
          .join(', '),
        reason:
          'Emphasize relevant existing experience without changing its wording or facts.',
      },
    ],
  };
}

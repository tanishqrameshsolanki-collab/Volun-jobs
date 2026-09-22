import type { CandidateProfile } from '@tanishq/shared';
import type { ResumeValidation, TailoringProposal } from './types';

export function validateTailoringProposal(
  proposal: TailoringProposal,
  candidate: CandidateProfile,
): ResumeValidation {
  const issues: string[] = [];
  const projectNames = new Set(
    candidate.projects.map((project) => project.name),
  );
  const skillGroups = new Set(Object.keys(candidate.skills));
  for (const project of proposal.selectedProjects)
    if (!projectNames.has(project)) issues.push(`Unknown project: ${project}`);
  for (const group of proposal.prioritizedSkillGroups)
    if (!skillGroups.has(group)) issues.push(`Unknown skill group: ${group}`);
  const bulletCount = candidate.experience[0]?.bullets.length ?? 0;
  for (const index of proposal.prioritizedExperienceBullets)
    if (index < 0 || index >= bulletCount)
      issues.push(`Unknown experience bullet: ${index}`);
  if (proposal.sourceMaster !== 'data/resumes/resume_master.docx')
    issues.push('Proposal must reference the immutable master resume');
  return { valid: issues.length === 0, issues };
}

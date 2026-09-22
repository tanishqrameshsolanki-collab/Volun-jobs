import type { CandidateProfile } from '@tanishq/shared';
import type { ApplicationQuestion, AnswerContext, AnswerDraft } from './types';
import { classifyQuestion } from './classifier';

const value = (
  question: ApplicationQuestion,
  candidate: CandidateProfile,
): { answer?: string; evidence: string[] } => {
  const label = `${question.id} ${question.label}`.toLowerCase();
  const personal = candidate.personalInformation;
  if (/first name/.test(label))
    return {
      answer: personal.fullName.split(' ')[0],
      evidence: ['personalInformation.fullName'],
    };
  if (/last name/.test(label))
    return {
      answer: personal.fullName.split(' ').slice(1).join(' '),
      evidence: ['personalInformation.fullName'],
    };
  if (/full name/.test(label))
    return {
      answer: personal.fullName,
      evidence: ['personalInformation.fullName'],
    };
  if (/e ?mail/.test(label))
    return { answer: personal.email, evidence: ['personalInformation.email'] };
  if (/phone|mobile|telephone/.test(label))
    return { answer: personal.phone, evidence: ['personalInformation.phone'] };
  if (/city|location/.test(label))
    return {
      answer: personal.location,
      evidence: ['personalInformation.location'],
    };
  if (/linkedin|github|portfolio|website/.test(label)) {
    const requested = /linkedin/.test(label)
      ? 'LinkedIn'
      : /github/.test(label)
        ? 'GitHub'
        : 'Portfolio';
    const link = candidate.links.find(
      (item) => item.label.toLowerCase() === requested.toLowerCase(),
    );
    return link?.url
      ? { answer: link.url, evidence: [`links.${requested}`] }
      : { evidence: [] };
  }
  if (/university|college|school|education/.test(label))
    return {
      answer: candidate.education[0]?.institution,
      evidence: ['education[0].institution'],
    };
  if (/degree|major/.test(label))
    return {
      answer: candidate.education[0]?.degree,
      evidence: ['education[0].degree'],
    };
  if (/graduat/.test(label))
    return {
      answer: String(candidate.education[0]?.expectedGraduationYear),
      evidence: ['education[0].expectedGraduationYear'],
    };
  if (/skill|technology/.test(label))
    return {
      answer: Object.values(candidate.skills).flat().join(', '),
      evidence: ['skills'],
    };
  return { evidence: [] };
};

export function buildSafeAnswer(
  question: ApplicationQuestion,
  candidate: CandidateProfile,
): AnswerDraft {
  const classification = classifyQuestion(question);
  const mapped = value(question, candidate);
  if (classification.type !== 'SAFE_AUTO_FILL')
    return {
      questionId: question.id,
      question: question.label,
      type: classification.type,
      status:
        classification.type === 'HUMAN_REQUIRED'
          ? 'ANSWER_REQUIRED'
          : 'REVIEW_REQUIRED',
      evidence: [],
      reason: classification.reason,
    };
  if (!mapped.answer)
    return {
      questionId: question.id,
      question: question.label,
      type: 'SAFE_AUTO_FILL',
      status: 'ANSWER_REQUIRED',
      evidence: [],
      reason:
        'The requested profile field is not confirmed in the candidate profile.',
    };
  return {
    questionId: question.id,
    question: question.label,
    type: 'SAFE_AUTO_FILL',
    answer: mapped.answer,
    status: 'READY_TO_FILL',
    evidence: mapped.evidence,
    reason: classification.reason,
  };
}

export function buildNarrativeDraft({
  question,
  candidate,
  job,
}: AnswerContext): AnswerDraft {
  const classification = classifyQuestion(question);
  if (classification.type !== 'AI_GENERATE_REVIEW')
    return {
      questionId: question.id,
      question: question.label,
      type: classification.type,
      status:
        classification.type === 'HUMAN_REQUIRED'
          ? 'ANSWER_REQUIRED'
          : 'REVIEW_REQUIRED',
      evidence: [],
      reason: classification.reason,
    };
  const project = candidate.projects[0];
  const role = job?.title ? ` for the ${job.title} role` : '';
  const answer = project
    ? `A relevant example is ${project.name}, where I ${project.bullets[0]?.replace(/^Built /i, 'built ') ?? project.description.toLowerCase()}. The project also involved ${project.bullets
        .slice(1, 3)
        .join(' ')
        .replace(
          /^Built /i,
          'building ',
        )} This reflects how I approach complex product work: make the system state explicit, validate outputs, and improve the experience through measured iteration.`
    : undefined;
  return {
    questionId: question.id,
    question: question.label,
    type: 'AI_GENERATE_REVIEW',
    answer: answer ? `${answer}${role}.` : undefined,
    status: answer ? 'REVIEW_REQUIRED' : 'ANSWER_REQUIRED',
    evidence: project ? [`projects.${project.name}`] : [],
    reason: answer
      ? 'Draft uses verified project evidence and must be reviewed before filling.'
      : 'No verified project evidence is available for a grounded draft.',
  };
}

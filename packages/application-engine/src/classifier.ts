import type { ApplicationQuestion, QuestionClassification } from './types';

const normalized = (question: ApplicationQuestion) =>
  `${question.id} ${question.label}`.toLowerCase().replace(/[^a-z0-9 ]/g, ' ');
const has = (value: string, pattern: RegExp) => pattern.test(value);

export function classifyQuestion(
  question: ApplicationQuestion,
): QuestionClassification {
  const value = normalized(question);
  if (
    has(
      value,
      /work authorization|authorized to work|legally allowed|sponsorship|sponsor|visa|citizenship|citizen|immigration/,
    )
  )
    return {
      type: 'HUMAN_REQUIRED',
      reason:
        'Legal work authorization or sponsorship question requires a candidate-confirmed answer.',
    };
  if (
    has(
      value,
      /gender|race|ethnicity|disab|veteran|sexual orientation|pronoun|criminal|conviction|demographic|voluntary self identification|self-identification|terms and conditions|legal declaration|consent|background check/,
    )
  )
    return {
      type: 'HUMAN_REQUIRED',
      reason:
        'Sensitive or legal declaration must never be inferred or auto-submitted.',
    };
  if (
    has(
      value,
      /why (this|the) (company|role|position)|why do you want|interested in|describe (a|your)|tell us about|technical challenge|project|strength|achievement|motivation|cover letter|additional information/,
    )
  )
    return {
      type: 'AI_GENERATE_REVIEW',
      reason:
        'Narrative response can be drafted from verified profile evidence but requires review.',
    };
  if (
    has(
      value,
      /first name|last name|full name|email|e mail|phone|mobile|telephone|linkedin|github|portfolio|website|city|location|university|college|school|degree|major|graduat|education|skill|technology|resume|cv/,
    )
  )
    return {
      type: 'SAFE_AUTO_FILL',
      reason:
        'Field maps to a stored candidate fact or uploaded resume artifact.',
    };
  return {
    type: 'HUMAN_REQUIRED',
    reason: 'Question is not recognized and must be answered by the candidate.',
  };
}

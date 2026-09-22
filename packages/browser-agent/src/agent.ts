import type { CandidateProfile } from '@tanishq/shared';
import {
  classifyQuestion,
  type ApplicationQuestion,
} from '@tanishq/application-engine';
import { createRun, record } from './events';
import { detectBlocker, canSubmit } from './policy';
import { fillAccessibleFields, mapAccessibleFields } from './field-map';
import type { ApplicationContext, AutomationRun, FieldName } from './types';

const candidateValues = (
  candidate: CandidateProfile,
): Partial<Record<FieldName, string>> => ({
  fullName: candidate.personalInformation.fullName,
  firstName: candidate.personalInformation.fullName.split(' ')[0],
  lastName: candidate.personalInformation.fullName
    .split(' ')
    .slice(1)
    .join(' '),
  email: candidate.personalInformation.email,
  phone: candidate.personalInformation.phone,
  location: candidate.personalInformation.location,
  linkedin: candidate.links.find((link) => link.label === 'LinkedIn')?.url,
  github: candidate.links.find((link) => link.label === 'GitHub')?.url,
  portfolio: candidate.links.find((link) => link.label === 'Portfolio')?.url,
});

export class BrowserAgent {
  constructor(private readonly context: ApplicationContext) {}

  private emit(
    run: AutomationRun,
    state: Parameters<typeof record>[1],
    message: string,
    metadata?: Record<string, unknown>,
  ) {
    const event = record(
      run,
      state,
      message,
      this.context.page.url(),
      metadata,
    );
    this.context.onEvent?.(event);
  }

  async prepareApplication(url: string): Promise<AutomationRun> {
    const run = createRun();
    try {
      this.emit(run, 'OPEN_APPLICATION', `Opening application: ${url}`);
      await this.context.page.goto(url, { waitUntil: 'domcontentloaded' });
      this.emit(
        run,
        'DETECT_FORM',
        'Application page opened; checking for blockers',
      );
      const blocker = await detectBlocker(this.context.page);
      if (blocker) {
        run.blockedReason = blocker;
        this.emit(run, 'AUTOMATION_BLOCKED', `Automation paused: ${blocker}`);
        return run;
      }
      this.emit(
        run,
        'MAP_FIELDS',
        'Mapping fields by accessible labels and roles',
      );
      const fields = await mapAccessibleFields(this.context.page);
      const labels = await this.context.page.locator('label').allTextContents();
      const questions = this.classifyFormQuestions(
        labels
          .map((label, index) => ({
            id: `label-${index}`,
            label: label.replace(/\s+/g, ' ').trim(),
          }))
          .filter((question) => question.label.length > 0),
      );
      const humanRequired = questions.find(
        ({ classification }) => classification.type === 'HUMAN_REQUIRED',
      );
      if (humanRequired) {
        run.blockedReason = 'HUMAN_REQUIRED';
        this.emit(
          run,
          'AUTOMATION_BLOCKED',
          `Automation paused for human-required question: ${humanRequired.question.label}`,
          { question: humanRequired.question.label },
        );
        return run;
      }
      this.emit(run, 'FILL_KNOWN_FIELDS', 'Filling verified candidate fields', {
        fields: Object.keys(fields),
      });
      const filled = await fillAccessibleFields(
        this.context.page,
        fields,
        candidateValues(this.context.candidate),
        this.context.resumePath,
      );
      this.emit(
        run,
        'FINAL_REVIEW',
        'Known fields filled; waiting for human review',
        { filled },
      );
      run.state = 'WAITING_FOR_APPROVAL';
      this.emit(
        run,
        'WAITING_FOR_APPROVAL',
        'Submission is disabled until explicit approval',
      );
      return run;
    } catch (error) {
      this.emit(
        run,
        'ERROR',
        error instanceof Error ? error.message : 'Browser automation failed',
      );
      return run;
    }
  }

  classifyFormQuestions(questions: ApplicationQuestion[]) {
    return questions.map((question) => ({
      question,
      classification: classifyQuestion(question),
    }));
  }

  async submitApproved(
    run: AutomationRun,
    explicitUserApproval: boolean,
  ): Promise<AutomationRun> {
    if (
      run.state !== 'WAITING_FOR_APPROVAL' ||
      !explicitUserApproval ||
      !canSubmit(this.context.policy)
    ) {
      run.state = 'AUTOMATION_BLOCKED';
      run.blockedReason = 'HUMAN_REQUIRED';
      this.emit(
        run,
        'AUTOMATION_BLOCKED',
        'Submission blocked: explicit approval and permitted automation are required',
      );
      return run;
    }
    try {
      this.emit(run, 'SUBMITTING', 'Submitting approved application');
      const submitButton = this.context.page
        .getByRole('button', { name: /submit application|submit/i })
        .first();
      if ((await submitButton.count()) === 0)
        throw new Error('Submit button was not found');
      await submitButton.click();
      this.emit(run, 'SUBMITTED', 'Application submission action completed');
    } catch (error) {
      this.emit(
        run,
        'ERROR',
        error instanceof Error
          ? error.message
          : 'Application submission failed',
      );
    }
    return run;
  }
}

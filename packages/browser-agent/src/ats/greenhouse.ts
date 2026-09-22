import type { Page } from 'playwright';
import type { CandidateProfile } from '@tanishq/shared';
import {
  classifyQuestion,
  type ApplicationQuestion,
  type QuestionClassification,
} from '@tanishq/application-engine';
import { fillAccessibleFields, mapAccessibleFields } from '../field-map';
import type { DiscoveredJob, NormalizedJob } from '@tanishq/job-engine';
import type { FieldMap, FieldName } from '../types';

export type GreenhouseFormInspection = {
  supported: boolean;
  fields: FieldMap;
  questions: Array<{
    question: ApplicationQuestion;
    classification: QuestionClassification;
  }>;
};

export class GreenhouseFormAdapter {
  readonly source = 'GREENHOUSE' as const;

  async supports(page: Page): Promise<boolean> {
    return (
      (await page
        .locator('form#application-form, form[data-automation="greenhouse"]')
        .count()) > 0
    );
  }

  async inspect(page: Page): Promise<GreenhouseFormInspection> {
    const supported = await this.supports(page);
    if (!supported) return { supported: false, fields: {}, questions: [] };
    const fields = await mapAccessibleFields(page);
    const labels = await page
      .locator(
        'form#application-form label, form[data-automation="greenhouse"] label',
      )
      .allTextContents();
    const questions = labels
      .map((label, index) => {
        const question = {
          id: `greenhouse-label-${index}`,
          label: label.replace(/\s+/g, ' ').trim(),
        };
        return { question, classification: classifyQuestion(question) };
      })
      .filter(({ question }) => question.label.length > 0);
    return { supported, fields, questions };
  }

  async fillKnownCandidateFields(
    page: Page,
    candidate: CandidateProfile,
    resumePath?: string,
  ) {
    const fields = await mapAccessibleFields(page);
    const values: Partial<Record<FieldName, string>> = {
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
      portfolio: candidate.links.find((link) => link.label === 'Portfolio')
        ?.url,
    };
    return fillAccessibleFields(page, fields, values, resumePath);
  }

  getApplicationUrl(job: DiscoveredJob | NormalizedJob): string {
    return job.applicationUrl;
  }
}

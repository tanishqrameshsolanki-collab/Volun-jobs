import type { Page } from 'playwright';
import type { FieldMap, FieldName } from './types';

const labels: Record<Exclude<FieldName, 'resume'>, string[]> = {
  firstName: ['first name', 'given name'],
  lastName: ['last name', 'family name'],
  fullName: ['full name', 'name'],
  email: ['email', 'e-mail'],
  phone: ['phone', 'mobile', 'telephone'],
  location: ['city', 'location'],
  linkedin: ['linkedin'],
  github: ['github'],
  portfolio: ['portfolio', 'website'],
};

export async function mapAccessibleFields(page: Page): Promise<FieldMap> {
  const result: FieldMap = {};
  for (const [field, candidates] of Object.entries(labels) as Array<
    [Exclude<FieldName, 'resume'>, string[]]
  >) {
    for (const label of candidates) {
      const locator = page.getByLabel(label, { exact: false }).first();
      if ((await locator.count()) > 0) {
        result[field] = { label, kind: 'input' };
        break;
      }
    }
  }
  const fileInput = page.locator('input[type="file"]').first();
  if ((await fileInput.count()) > 0)
    result.resume = { label: 'resume', kind: 'file' };
  return result;
}

export async function fillAccessibleFields(
  page: Page,
  fieldMap: FieldMap,
  values: Partial<Record<FieldName, string>>,
  resumePath?: string,
): Promise<string[]> {
  const filled: string[] = [];
  for (const [field, fieldInfo] of Object.entries(fieldMap) as Array<
    [FieldName, { label: string; kind: 'input' | 'file' }]
  >) {
    if (field === 'resume' && resumePath) {
      await page
        .locator('input[type="file"]')
        .first()
        .setInputFiles(resumePath);
      filled.push(field);
      continue;
    }
    const value = values[field];
    if (!value || fieldInfo.kind !== 'input') continue;
    await page
      .getByLabel(fieldInfo.label, { exact: false })
      .first()
      .fill(value);
    filled.push(field);
  }
  return filled;
}

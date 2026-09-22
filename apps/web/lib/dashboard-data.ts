import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  buildDashboardSummary,
  type DashboardOpportunity,
  type DashboardSummary,
} from '@tanishq/shared';
import { loadPersistedOpportunities } from './opportunity-data';

const opportunitiesPath = path.resolve(
  process.cwd(),
  '../../data/opportunities/jobs.json',
);

export async function loadDashboardSummary(): Promise<DashboardSummary> {
  const persisted = await loadPersistedOpportunities();
  if (persisted !== null) return buildDashboardSummary(persisted);
  const raw = JSON.parse(await readFile(opportunitiesPath, 'utf8')) as unknown;
  if (!Array.isArray(raw))
    throw new Error('Opportunity store must contain an array');
  return buildDashboardSummary(raw as DashboardOpportunity[]);
}

export { opportunitiesPath };

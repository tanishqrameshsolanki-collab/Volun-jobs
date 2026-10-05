import { NextResponse } from 'next/server';
import { loadPersistedOpportunities } from '../../../lib/opportunity-data';
import { readFile } from 'node:fs/promises';
import { opportunitiesPath } from '../../../lib/dashboard-data';
import type { DashboardOpportunity } from '@tanishq/shared';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const search = (url.searchParams.get('q') || '').toLowerCase().trim();
    const remoteOnly = url.searchParams.get('remote') === 'true';
    const minScore = Number.parseInt(url.searchParams.get('minScore') || '0', 10);
    const eligibilityFilter = url.searchParams.get('eligibility');

    let opportunities = await loadPersistedOpportunities();
    if (!opportunities || opportunities.length === 0) {
      // Fallback to local store for demo / initial exploration
      try {
        const raw = JSON.parse(await readFile(opportunitiesPath, 'utf8')) as DashboardOpportunity[];
        opportunities = Array.isArray(raw) ? raw : [];
      } catch {
        opportunities = [];
      }
    }

    let filtered = opportunities;

    if (search) {
      filtered = filtered.filter((opp) => {
        const text = `${opp.title} ${opp.company} ${opp.location ?? ''} ${opp.whyItMatches.join(' ')}`.toLowerCase();
        return text.includes(search);
      });
    }

    if (remoteOnly) {
      filtered = filtered.filter((opp) => {
        const loc = (opp.location || '').toLowerCase();
        return loc.includes('remote') || loc.includes('anywhere');
      });
    }

    if (minScore > 0) {
      filtered = filtered.filter((opp) => opp.matchScore >= minScore);
    }

    if (eligibilityFilter && eligibilityFilter !== 'ALL') {
      filtered = filtered.filter((opp) => opp.eligibility === eligibilityFilter);
    }

    return NextResponse.json({
      total: filtered.length,
      jobs: filtered,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to query jobs' },
      { status: 500 },
    );
  }
}

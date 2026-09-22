import { NextResponse } from 'next/server';
import { loadDashboardSummary } from '../../../lib/dashboard-data';

export async function GET() {
  try {
    return NextResponse.json(await loadDashboardSummary());
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Dashboard could not be loaded',
      },
      { status: 500 },
    );
  }
}

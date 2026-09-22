import { NextResponse } from 'next/server';
import { loadAnalytics } from '../../../lib/analytics-data';

export async function GET() {
  try {
    return NextResponse.json(await loadAnalytics());
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Analytics could not be loaded',
      },
      { status: 500 },
    );
  }
}

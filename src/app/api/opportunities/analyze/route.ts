import { NextResponse } from 'next/server';
import { runAIAnalysis, getRecentAnalysisRuns } from '@/lib/opportunities-data';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // AI analysis is resource-intensive; restrict to authenticated cron calls
  const authError = requireCronSecret(request);
  if (authError) return authError;

  try {
    const body = await request.json().catch(() => ({}));
    const focusAreas = body.focusAreas as string[] | undefined;

    const result = await runAIAnalysis(focusAreas);
    return NextResponse.json(result);
  } catch (error) {
    logger.error('Failed to run AI analysis', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to run AI analysis' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const runs = await getRecentAnalysisRuns();
    return NextResponse.json({ runs });
  } catch (error) {
    logger.error('Failed to fetch analysis runs', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch analysis runs' },
      { status: 500 }
    );
  }
}

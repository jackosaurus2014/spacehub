import { NextResponse } from 'next/server';
import { runAIAnalysis, getRecentAnalysisRuns } from '@/lib/opportunities-data';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const focusAreas = body.focusAreas as string[] | undefined;

    const result = await runAIAnalysis(focusAreas);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to run AI analysis:', error);
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
    console.error('Failed to fetch analysis runs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analysis runs' },
      { status: 500 }
    );
  }
}

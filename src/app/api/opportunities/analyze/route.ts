import { NextResponse } from 'next/server';
import { getRecentAnalysisRuns } from '@/lib/opportunities-data';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// POST disabled (2026-08-14 data-integrity fix): this triggered
// runAIAnalysis() to fabricate speculative BusinessOpportunity rows
// (sourceType 'ai_generated') — e.g. "Orbital Bio-Enhancement Clinics" at
// $1B-$5B, 0.82 confidence — that were mixed in with real sam_gov/
// news_analysis opportunities on /business-opportunities with
// fabricated-precision valuations and no disclosure. Founder decision:
// retire AI-generated opportunities entirely rather than badge them. The
// cron that called this generation path (via /api/refresh?type=
// opportunities-analysis) was removed from src/lib/cron-scheduler.ts, and
// getOpportunities()/getOpportunityStats() in src/lib/opportunities-data.ts
// now hard-exclude sourceType 'ai_generated' regardless of status. GET
// below is left intact — it only reads historical AIAnalysisRun records.
export async function POST() {
  return NextResponse.json(
    { error: 'AI-generated opportunity analysis has been retired. See src/lib/opportunities-data.ts.' },
    { status: 410 }
  );
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

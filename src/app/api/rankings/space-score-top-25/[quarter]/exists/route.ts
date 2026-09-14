import { NextResponse } from 'next/server';
import { parseQuarterParam, quarterOf, EARLIEST_SPACE_SCORE_QUARTER } from '@/lib/rankings';

// Real-404 mechanism for /rankings/space-score-top-25/[quarter]
// (route-404-status guard). Quarter validity is pure date math, but editions
// roll forward WITHOUT a deploy, so static params would 404 each new quarter
// until the next build. Middleware contract: HTTP 404 = missing; anything
// else falls open and the page applies its own notFound().
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, props: { params: Promise<{ quarter: string }> }) {
  const params = await props.params;
  try {
    const parsed = parseQuarterParam(params.quarter);
    const exists =
      !!parsed && parsed.key >= EARLIEST_SPACE_SCORE_QUARTER && parsed.key <= quarterOf().key;
    if (!exists) {
      return NextResponse.json(
        { exists: false },
        { status: 404, headers: { 'Cache-Control': 'public, s-maxage=3600' } },
      );
    }
    return NextResponse.json({ exists: true }, { headers: { 'Cache-Control': 'public, s-maxage=3600' } });
  } catch {
    // Fail open — a broken check must never 404 real content.
    return NextResponse.json({ exists: true, error: true }, { status: 200 });
  }
}

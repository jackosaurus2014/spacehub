import { NextResponse } from 'next/server';
import { parseMonthParam, latestEditionMonthKey, EARLIEST_INDEX_MONTH } from '@/lib/hiring-index';

// Real-404 mechanism for /rankings/fastest-hiring/[month] — same contract as
// the Hiring Index probe it mirrors: months from the first snapshot month to
// the most recently completed month exist; everything else is a genuine 404.
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, props: { params: Promise<{ month: string }> }) {
  const params = await props.params;
  try {
    const parsed = parseMonthParam(params.month);
    const exists =
      !!parsed && params.month >= EARLIEST_INDEX_MONTH && params.month <= latestEditionMonthKey();
    if (!exists) {
      return NextResponse.json(
        { exists: false },
        { status: 404, headers: { 'Cache-Control': 'public, s-maxage=3600' } },
      );
    }
    return NextResponse.json({ exists: true }, { headers: { 'Cache-Control': 'public, s-maxage=3600' } });
  } catch {
    return NextResponse.json({ exists: true, error: true }, { status: 200 });
  }
}

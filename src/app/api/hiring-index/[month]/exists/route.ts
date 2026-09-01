import { NextResponse } from 'next/server';
import { parseMonthParam, latestEditionMonthKey } from '@/lib/hiring-index';

// Real-404 mechanism for /hiring-index/[month] (route-404-status guard):
// month validity is pure date math (YYYY-MM within [first edition, latest
// closed month]) — no DB — but editions roll forward monthly WITHOUT a
// deploy, so static params would 404 each new edition until the next build.
// Middleware contract: HTTP 404 = missing; anything else falls open (the
// page renders and applies its own notFound()).
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { month: string } }) {
  try {
    const parsed = parseMonthParam(params.month);
    const exists = !!parsed && params.month >= '2026-08' && params.month <= latestEditionMonthKey();
    if (!exists) {
      return NextResponse.json({ exists: false }, { status: 404, headers: { 'Cache-Control': 'public, s-maxage=3600' } });
    }
    return NextResponse.json({ exists: true }, { headers: { 'Cache-Control': 'public, s-maxage=3600' } });
  } catch {
    // Fail open — a broken check must never 404 real content.
    return NextResponse.json({ exists: true, error: true }, { status: 200 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/errors';
import { rollupTradeStatsForDay } from '@/lib/game/market-share';

export const dynamic = 'force-dynamic';

/**
 * POST /api/space-tycoon/market/share/rollup
 * Wave E6 (docs/ECONOMY_PVP_2026-08.md §E6) — daily rollup of the previous
 * UTC day's MarketFill activity into TradeStatDaily (the "cached sensibly"
 * layer for market-share.ts's heavier reports). Idempotent (upsert) —
 * safe to re-run or to run against a specific `day` for backfill.
 *
 * Auth: Bearer CRON_SECRET via requireCronSecret (fail-closed). Note the
 * middleware cronPaths list only exempts these routes from the CSRF check —
 * it does NOT authenticate them; this handler does.
 *
 * Body (optional): { day?: string (ISO date) }
 *
 * Scheduling this route on a daily cron is a deploy-config action (Railway
 * cron / equivalent) outside this module — see market-share.ts's
 * rollupTradeStatsForDay() doc comment. Until scheduled, every telemetry
 * read still works correctly via the live-scan fallback in market-share.ts;
 * this endpoint only improves read latency once wired up and once volume
 * outgrows a live scan.
 */
export async function POST(request: NextRequest) {
  const auth = requireCronSecret(request);
  if (auth) return auth;

  try {
    const body = await request.json().catch(() => ({}));

    const day = typeof body.day === 'string' && !Number.isNaN(Date.parse(body.day))
      ? new Date(body.day)
      : undefined;

    const result = await rollupTradeStatsForDay(day);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Market share rollup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

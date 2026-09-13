import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/lib/errors';
import prisma from '@/lib/db';
import { completeDueAssets } from '@/lib/game/server-assets';
// Mining Phase A (2026-09-12): the same 5-minute pass settles due Mining
// Orders — the only path that creates ore for a synced profile.
import { completeDueMiningOrders } from '@/lib/game/server-mining';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/assets-complete — every 5 minutes (cron-scheduler.ts
 * 'tycoon-assets-complete'). Flips ServerAsset rows pending → complete
 * where completesAt <= now (docs/SECURITY_AUDIT_2026-09.md "Phase 3 slice 1
 * — buildings"). Idempotent; the sync and GET /assets run the same pass
 * lazily, so a missed tick only delays the flip until the next read.
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}` — same as every /api/cron/*.
 */
export async function POST(request: NextRequest) {
  const auth = requireCronSecret(request);
  if (auth) return auth;

  const startedAt = Date.now();
  try {
    const completed = await completeDueAssets(prisma);
    const miningSettled = await completeDueMiningOrders(prisma);
    const durationMs = Date.now() - startedAt;
    logger.info('assets-complete cron completed', { completed, miningSettled, durationMs });
    return NextResponse.json({ success: true, completed, miningSettled, durationMs });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('assets-complete cron failed', { error: msg });
    return NextResponse.json({ error: 'Internal server error', detail: msg }, { status: 500 });
  }
}

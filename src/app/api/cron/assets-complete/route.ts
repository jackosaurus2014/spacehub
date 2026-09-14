import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/lib/errors';
import prisma from '@/lib/db';
import { completeDueAssets } from '@/lib/game/server-assets';
// Mining Phase A (2026-09-12): the same 5-minute pass settles due Mining
// Orders — the only path that creates ore for a synced profile.
import { completeDueMiningOrders, chargeClaimUpkeep, expireDueClaims, respawnExhaustedRocks } from '@/lib/game/server-mining';
// CC-2 (docs/COMMAND_CENTER_DESIGN_2026-09-13.md): the same pass completes
// due headquarters relocations and renews / releases seat leases.
import {
  chargeHqSeatUpkeep, completeDueHqRelocations, renewHqSeatLeases, resolveDueHqSeatAuctions,
} from '@/lib/game/hq-relocation-server';
// CC-4: the same pass advances interstellar expeditions on the world clock
// (outbound -> exploring -> returning -> complete). Their completion is what
// the interstellar HQ gate counts and what the sync's expedition headroom
// credit is priced from, so it must never depend on a client being awake.
import { advanceDueExpeditions } from '@/lib/game/server-expeditions';

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
    // Mining Phase B (2026-09-13): claims lapse (unworked), upkeep is charged
    // (unpaid → lapsed), exhausted rocks re-chart after their cycle.
    const claimsExpired = await expireDueClaims(prisma);
    const claimUpkeep = await chargeClaimUpkeep(prisma);
    const rocksRespawned = await respawnExhaustedRocks(prisma);
    const hqRelocated = await completeDueHqRelocations(prisma);
    const hqSeats = await renewHqSeatLeases(prisma);
    // CC-3: seat rent (unpaid past the grace period lapses the seat and
    // sends the headquarters home) and sealed-bid seat auctions for Mars and
    // outward (winner burned, losers refunded in full).
    const hqUpkeep = await chargeHqSeatUpkeep(prisma);
    const hqAuctions = await resolveDueHqSeatAuctions(prisma);
    const expeditions = await advanceDueExpeditions(prisma);
    const durationMs = Date.now() - startedAt;
    logger.info('assets-complete cron completed', { completed, miningSettled, claimsExpired, claimUpkeep, rocksRespawned, hqRelocated, hqSeats, hqUpkeep, hqAuctions, expeditions, durationMs });
    return NextResponse.json({ success: true, completed, miningSettled, claimsExpired, claimUpkeep, rocksRespawned, hqRelocated, hqSeats, hqUpkeep, hqAuctions, expeditions, durationMs });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('assets-complete cron failed', { error: msg });
    return NextResponse.json({ error: 'Internal server error', detail: msg }, { status: 500 });
  }
}

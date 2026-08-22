import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/lib/errors';
import { getCrisisWindow, getCrisisForCycle } from '@/lib/game/systemic-crises';
import {
  isCrisisSchemaAvailable,
  ensureCrisisCycle,
  sealClosedCrisisCycles,
} from '@/lib/game/server-crises';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * AAA Program Round 2: the systemic-crisis sealer
 * (cron-scheduler.ts 'tycoon-crisis-resolve').
 *
 * AUTH: requireCronSecret. The previous comment claimed CRON_SECRET
 * authentication "via middleware.ts's cronPaths" — that was false, and the
 * mistake was copied across three resolve crons. cronPaths only *skips CSRF*
 * when a valid secret is present; it never *requires* one, so this sealer was
 * world-callable by anyone sending a matching `Origin` header.
 *
 * Deterministic and idempotent. Every run:
 *   1. seals every open cycle whose four-week active window has closed,
 *      oldest first, stamping the containment fraction the pool actually
 *      reached — that row is the permanent public record;
 *   2. ensures the CURRENT cycle's row exists, which is what MEASURES and
 *      PUBLISHES the world index. Doing this on a cron rather than on first
 *      player sync means the forecast is on the register the moment the
 *      forecast phase opens, so a corporation that logs in on day one of the
 *      cycle reads the same published number as one that logs in on day
 *      thirteen.
 *
 * There is no gate here and no fabricated participation: if nobody pledges,
 * containment seals at 0 and the aftermath applies the shortfall
 * consequence, which is the honest outcome.
 */
export async function POST(request: Request) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  try {
    if (!(await isCrisisSchemaAvailable())) {
      return NextResponse.json({ skipped: 'systemic crisis schema not provisioned' });
    }
    const now = Date.now();
    const win = getCrisisWindow(now);
    const sealed = await sealClosedCrisisCycles(now);
    const cycle = await ensureCrisisCycle(win.cycleIndex, now);
    const def = getCrisisForCycle(win.cycleIndex);

    return NextResponse.json({
      ok: true,
      sealed,
      cycleIndex: win.cycleIndex,
      phase: win.phase,
      crisisId: def.id,
      worldIndex: cycle?.worldIndex ?? null,
      worldIndexMeasured: cycle?.worldIndexMeasured ?? null,
      assessmentTargetUsd: cycle?.assessmentTargetUsd ?? null,
      pledgedUsd: cycle?.pledgedUsd ?? null,
      pledgeCount: cycle?.pledgeCount ?? null,
    });
  } catch (error) {
    logger.error('Crisis resolve failed', { error: String(error) });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

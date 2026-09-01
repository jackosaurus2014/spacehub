import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * SatelliteAsset global-signal probe (2026-08-31 freshness audit, item 6).
 *
 * The SatelliteAsset table has ZERO writers in prod — no fetcher, cron, or
 * seed populates it — so every company legitimately has a 0 count. The
 * scoring libs (company-completeness.ts, company-scoring.ts, space-score.ts)
 * accept a satelliteSignalAvailable option so a globally-empty table is
 * treated as "no signal" (term skipped, category rescaled) instead of "this
 * company owns zero satellites".
 *
 * This helper answers "does the table have ANY rows?" with a small in-memory
 * cache. Asymmetric TTLs: once satellites exist the answer is sticky for an
 * hour (population won't be un-shipped mid-process), while an empty answer is
 * re-checked every 10 minutes so scores pick up a future backfill promptly.
 * Fails open to `true` (legacy behavior — count the term) on DB errors, so a
 * transient outage never silently changes scoring semantics.
 *
 * Delete this module when full SatelliteAsset population ships (tracked as a
 * separate future project — do not bolt population onto this fix).
 */

const EMPTY_RECHECK_MS = 10 * 60 * 1000;
const NONEMPTY_STICKY_MS = 60 * 60 * 1000;

let cached: { available: boolean; checkedAt: number } | null = null;

export async function satelliteAssetSignalAvailable(): Promise<boolean> {
  const now = Date.now();
  if (cached) {
    const ttl = cached.available ? NONEMPTY_STICKY_MS : EMPTY_RECHECK_MS;
    if (now - cached.checkedAt < ttl) return cached.available;
  }

  try {
    const row = await prisma.satelliteAsset.findFirst({ select: { id: true } });
    cached = { available: row !== null, checkedAt: now };
    return cached.available;
  } catch (error) {
    logger.warn('satelliteAssetSignalAvailable probe failed — defaulting to legacy behavior', {
      error: error instanceof Error ? error.message : String(error),
    });
    return cached?.available ?? true;
  }
}

/** Test hook: clear the cached probe result. */
export function __resetSatelliteSignalCache(): void {
  cached = null;
}

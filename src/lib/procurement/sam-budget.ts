/**
 * SAM.gov shared daily call budget.
 *
 * The SAM.gov API key backing this app is NOT entity-verified, so its real
 * quota is roughly 5-10 calls/day (observed live 2026-09-01 through
 * 2026-09-03). Three independent daily crons used to hit SAM.gov with no
 * coordination between them — this module is the single shared gate all of
 * them now go through:
 *
 *   - procurement-sam-refresh (30 13 * * *) -> fetchSAMOpportunities()
 *     label 'procurement' — 2 calls/day (one per rotated NAICS code, see
 *     src/lib/procurement/sam-gov.ts). This is the DAILY PRIORITY CONSUMER:
 *     it backs the public /procurement page, so PROCUREMENT_RESERVE keeps
 *     the last calls of the budget reserved for it even if the other two
 *     paths already spent the rest of the day's budget.
 *
 *   - space-defense-refresh (0 6 * * *) -> fetchDefenseProcurement()
 *     label 'space-defense' — gated to run its SAM leg at most weekly (see
 *     shouldRunWeeklySamLeg below) since /space-defense's live-procurement
 *     panel is a secondary view over data /procurement already fetches
 *     daily. Only the SAM call is gated; the cron itself (news + RSS) still
 *     runs daily.
 *
 *   - funding-opportunities-refresh (0 9 * * *) ->
 *     fetchSamGovOpportunities() in src/lib/funding/opportunity-fetcher.ts
 *     label 'funding' — this fetcher calls api.sam.gov DIRECTLY, bypassing
 *     fetchSAMOpportunities()'s cache/circuit-breaker entirely (found while
 *     building this budget — see report). It now reserves from this same
 *     shared budget and is gated weekly for the same reason as
 *     space-defense, so it can't independently exhaust the day's quota.
 *
 * SAM_DAILY_BUDGET defaults to 8 — comfortably above procurement's daily
 * 2-call need plus either secondary leg's weekly 1-2 calls, and comfortably
 * below the observed real quota, so a single day's runs shouldn't trip a
 * live 429 outright. PROCUREMENT_RESERVE (2) holds back the last 2 calls of
 * the budget exclusively for label 'procurement': once
 * `used >= budget - PROCUREMENT_RESERVE`, only 'procurement' may still
 * spend the remainder.
 *
 * Persistence: the counter is stored through the existing generic
 * DynamicContent store (src/lib/dynamic-content.ts — the same
 * upsertContent()/getContentItem() pattern used by
 * src/lib/fetchers/space-track-fetcher.ts) under module 'procurement',
 * contentKey `sam-quota:YYYY-MM-DD` (UTC day), so the count survives a
 * process restart mid-day. A small in-memory mirror avoids a DB round trip
 * on every reservation within the same process/day. If the store itself
 * errors, every check here FAILS OPEN (allow the call, log a warning) —
 * an unrelated DB hiccup must never silently block all SAM.gov traffic.
 */

import { upsertContent, getContentItem } from '@/lib/dynamic-content';
import { logger } from '@/lib/logger';

export const SAM_DAILY_BUDGET = Number(process.env.SAM_DAILY_BUDGET) || 8;
export const PROCUREMENT_RESERVE = 2;

export type SamCallLabel = 'procurement' | 'space-defense' | 'funding';

interface SamQuotaRecord {
  calls: number;
  lastAt: string;
  byLabel: Record<string, number>;
}

function isSamQuotaRecord(value: unknown): value is SamQuotaRecord {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as SamQuotaRecord).calls === 'number' &&
    typeof (value as SamQuotaRecord).byLabel === 'object'
  );
}

function dayKeyUTC(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function quotaContentKey(dayKey: string): string {
  return `sam-quota:${dayKey}`;
}

function emptyRecord(): SamQuotaRecord {
  return { calls: 0, lastAt: new Date(0).toISOString(), byLabel: {} };
}

// In-memory mirror keyed by dayKey. A new UTC day simply never hits an old
// entry again, so this doubles as the "counter rolls at midnight" behavior
// without any explicit reset logic.
const mirror = new Map<string, SamQuotaRecord>();

async function loadRecord(dayKey: string): Promise<SamQuotaRecord> {
  const cached = mirror.get(dayKey);
  if (cached) return cached;

  try {
    const item = await getContentItem<SamQuotaRecord>(quotaContentKey(dayKey));
    const record = isSamQuotaRecord(item?.data) ? item!.data : emptyRecord();
    mirror.set(dayKey, record);
    return record;
  } catch (error) {
    logger.warn('SAM budget store read failed — failing open', {
      error: error instanceof Error ? error.message : String(error),
    });
    return emptyRecord();
  }
}

async function persistRecord(dayKey: string, record: SamQuotaRecord): Promise<void> {
  mirror.set(dayKey, record);
  try {
    await upsertContent(quotaContentKey(dayKey), 'procurement', 'sam-quota', record, {
      sourceType: 'api',
    });
  } catch (error) {
    logger.warn('SAM budget store write failed — counter may not survive a restart', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export interface SamBudgetReservation {
  allowed: boolean;
  used: number;
  budget: number;
}

/**
 * Reserve one call against today's (UTC) SAM.gov budget for `label`.
 *
 * Returns `{ allowed: false }` WITHOUT incrementing the counter when the
 * budget (or, for non-'procurement' labels, the reserved share of it) is
 * already spent — callers must check `allowed` and skip the actual network
 * request when it's false.
 */
export async function reserveSamCall(label: SamCallLabel): Promise<SamBudgetReservation> {
  const dayKey = dayKeyUTC();
  const budget = SAM_DAILY_BUDGET;

  let record: SamQuotaRecord;
  try {
    record = await loadRecord(dayKey);
  } catch (error) {
    // loadRecord already fails open internally, but guard again in case a
    // future refactor lets it throw — a budget check must never itself
    // become the reason SAM.gov traffic stops.
    logger.warn('SAM budget check failed — failing open', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { allowed: true, used: 0, budget };
  }

  const used = record.calls;

  if (used >= budget) {
    return { allowed: false, used, budget };
  }
  if (label !== 'procurement' && used >= budget - PROCUREMENT_RESERVE) {
    return { allowed: false, used, budget };
  }

  const updated: SamQuotaRecord = {
    calls: record.calls + 1,
    lastAt: new Date().toISOString(),
    byLabel: { ...record.byLabel, [label]: (record.byLabel[label] || 0) + 1 },
  };
  await persistRecord(dayKey, updated);
  return { allowed: true, used: updated.calls, budget };
}

export interface SamBudgetStatus {
  used: number;
  budget: number;
  byLabel: Record<string, number>;
  dayKey: string;
}

export async function getSamBudgetStatus(): Promise<SamBudgetStatus> {
  const dayKey = dayKeyUTC();
  const record = await loadRecord(dayKey);
  return { used: record.calls, budget: SAM_DAILY_BUDGET, byLabel: record.byLabel, dayKey };
}

// ---------------------------------------------------------------------------
// Weekly gate — for secondary SAM.gov consumers (space-defense, funding).
// Independent of the daily call budget above: even inside budget, these two
// legs should only actually call SAM.gov about once a week (see module
// header). 'procurement' does not use this — it runs daily by design.
// ---------------------------------------------------------------------------

const WEEKLY_MS = 7 * 24 * 60 * 60 * 1000;

function weeklyMarkerKey(label: string): string {
  return `sam-weekly:${label}`;
}

/**
 * True if `label`'s SAM.gov leg has never run, or last ran >= 7 days ago.
 * Fails open (returns true) on a store error — the same policy as
 * reserveSamCall — so a DB hiccup can't permanently starve a weekly fetch.
 */
export async function shouldRunWeeklySamLeg(label: string): Promise<boolean> {
  try {
    const item = await getContentItem<{ lastRunAt: string }>(weeklyMarkerKey(label));
    const lastRunAt = item?.data?.lastRunAt;
    if (!lastRunAt) return true;
    return Date.now() - new Date(lastRunAt).getTime() >= WEEKLY_MS;
  } catch (error) {
    logger.warn('SAM weekly-gate check failed — failing open', {
      label,
      error: error instanceof Error ? error.message : String(error),
    });
    return true;
  }
}

/** Record that `label`'s SAM.gov leg just ran, resetting its weekly clock. */
export async function recordWeeklySamLegRun(label: string): Promise<void> {
  try {
    await upsertContent(
      weeklyMarkerKey(label),
      'procurement',
      'sam-weekly',
      { lastRunAt: new Date().toISOString() },
      { sourceType: 'api' },
    );
  } catch (error) {
    logger.warn('SAM weekly-gate store write failed', {
      label,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

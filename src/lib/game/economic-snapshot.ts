// ─── Space Tycoon: EconomicSnapshot — take / prune / restore ─────────────────
// docs/SIMULATION_INTEGRITY_TOOLING.md §S3 (rollback prerequisite) and
// docs/SECURITY_AUDIT_2026-09.md "Server-authoritative inventory — phase 1".
//
// A snapshot is a point-in-time copy of the economic columns of one
// GameProfile. Three writers:
//   'daily'     — the economic-snapshot cron, every profile synced in the last
//                 30 days;
//   'pre-clamp' — the sync route, immediately before it persists an ENFORCED
//                 resource clamp, so a false positive is reversible;
//   'manual'    — staff, by hand (restoreEconomicSnapshot's counterpart).
//
// Retention (enforced by pruneEconomicSnapshots, the "simple version"):
//   daily      14 days, except the Monday (UTC) row which lives 90 days —
//              one keeper per profile per week without a per-profile query;
//   pre-clamp  90 days (forensic);
//   manual     365 days.
//
// `restoreEconomicSnapshot` is an ADMIN HELPER ONLY. It is deliberately not
// exposed as a route yet: the S3 spec wants dual-control + a public notice
// before any rollback executes, and that workflow (RollbackAction) is phase 2.

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  RESOURCE_BASELINE_KEY,
  RESOURCE_CEILINGS_KEY,
  selectCeilingsToStash,
} from './resource-plausibility';

export type SnapshotReason = 'daily' | 'pre-clamp' | 'manual';

export const DAILY_RETENTION_DAYS = 14;
export const WEEKLY_KEEPER_RETENTION_DAYS = 90;
export const PRE_CLAMP_RETENTION_DAYS = 90;
export const MANUAL_RETENTION_DAYS = 365;
/** Profiles that have not synced for longer than this are not snapshotted
 *  daily — nothing about them changes, and the last snapshot still stands. */
export const ACTIVE_WINDOW_DAYS = 30;
export const SNAPSHOT_BATCH_SIZE = 200;

const DAY_MS = 24 * 3600_000;

/** The profile columns a snapshot copies. */
export interface SnapshotSourceRow {
  id: string;
  money: number;
  netWorth: number;
  resources: unknown;
  buildingsData: unknown;
  shipsData: unknown;
  completedResearchList: string[];
  activeServicesData: unknown;
  workforceData: unknown;
}

export const SNAPSHOT_SOURCE_SELECT = {
  id: true,
  money: true,
  netWorth: true,
  resources: true,
  buildingsData: true,
  shipsData: true,
  completedResearchList: true,
  activeServicesData: true,
  workforceData: true,
} as const;

type Db = typeof prisma;

/** Shape a profile row into an EconomicSnapshot create payload. */
export function snapshotDataFromRow(row: SnapshotSourceRow, reason: SnapshotReason) {
  const json = (v: unknown, fallback: object) => (v && typeof v === 'object' ? (v as object) : fallback);
  return {
    profileId: row.id,
    reason,
    money: Number.isFinite(row.money) ? row.money : 0,
    netWorth: Number.isFinite(row.netWorth) ? row.netWorth : 0,
    resources: json(row.resources, {}),
    buildingsData: json(row.buildingsData, []),
    shipsData: json(row.shipsData, []),
    completedResearchList: Array.isArray(row.completedResearchList)
      ? row.completedResearchList.filter((r): r is string => typeof r === 'string')
      : [],
    activeServicesData: row.activeServicesData && typeof row.activeServicesData === 'object'
      ? (row.activeServicesData as object)
      : undefined,
    workforceData: row.workforceData && typeof row.workforceData === 'object'
      ? (row.workforceData as object)
      : undefined,
  };
}

/** Snapshot one profile from an already-loaded row (no extra read). */
export async function takeEconomicSnapshotFromRow(
  row: SnapshotSourceRow,
  reason: SnapshotReason,
  db: Db = prisma,
): Promise<{ id: string } | null> {
  try {
    const created = await db.economicSnapshot.create({
      data: snapshotDataFromRow(row, reason),
      select: { id: true },
    });
    return created;
  } catch (error) {
    // The table may lag the deploy (DDL is applied by hand — see the
    // scratchpad DDL in the phase-1 report). Never block the caller.
    logger.error('EconomicSnapshot create failed', { profileId: row.id, reason, error: String(error) });
    return null;
  }
}

/** Snapshot one profile by id. */
export async function takeEconomicSnapshot(
  profileId: string,
  reason: SnapshotReason,
  db: Db = prisma,
): Promise<{ id: string } | null> {
  const row = await db.gameProfile.findUnique({ where: { id: profileId }, select: SNAPSHOT_SOURCE_SELECT });
  if (!row) return null;
  return takeEconomicSnapshotFromRow(row as SnapshotSourceRow, reason, db);
}

export interface DailySnapshotResult {
  profilesConsidered: number;
  snapshotsWritten: number;
  batches: number;
  pruned: PruneResult;
}

/** Daily pass: snapshot every profile that synced in the last 30 days, in
 *  id-ordered batches (cursor pagination keeps memory flat at any player
 *  count), then prune. */
export async function runDailyEconomicSnapshots(now: Date = new Date(), db: Db = prisma): Promise<DailySnapshotResult> {
  const since = new Date(now.getTime() - ACTIVE_WINDOW_DAYS * DAY_MS);
  let cursor: string | undefined;
  let profilesConsidered = 0;
  let snapshotsWritten = 0;
  let batches = 0;

  for (;;) {
    const rows = await db.gameProfile.findMany({
      where: { lastSyncAt: { gte: since } },
      select: SNAPSHOT_SOURCE_SELECT,
      orderBy: { id: 'asc' },
      take: SNAPSHOT_BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (rows.length === 0) break;
    batches++;
    profilesConsidered += rows.length;
    const result = await db.economicSnapshot.createMany({
      data: rows.map(r => ({ ...snapshotDataFromRow(r as SnapshotSourceRow, 'daily'), takenAt: now })),
    });
    snapshotsWritten += result.count;
    cursor = rows[rows.length - 1].id;
    if (rows.length < SNAPSHOT_BATCH_SIZE) break;
  }

  const pruned = await pruneEconomicSnapshots(now, db);
  return { profilesConsidered, snapshotsWritten, batches, pruned };
}

export interface PruneResult {
  dailyDeleted: number;
  weeklyKeepersDeleted: number;
  preClampDeleted: number;
  manualDeleted: number;
}

/**
 * Retention, simple version. "Keep one per profile per week for 90 days" is
 * implemented as "the Monday (UTC) daily row is the weekly keeper": the
 * 14-day prune skips rows whose takenAt falls on a Monday (Postgres
 * `EXTRACT(DOW …) = 1`), and a second pass removes keepers older than 90
 * days. The cron runs at 03:20 UTC so every profile's Monday row exists
 * whenever the profile was active that week; a profile that only syncs on
 * weekends simply has no keeper for that week — accepted for phase 1.
 */
export async function pruneEconomicSnapshots(now: Date = new Date(), db: Db = prisma): Promise<PruneResult> {
  const dailyCutoff = new Date(now.getTime() - DAILY_RETENTION_DAYS * DAY_MS);
  const keeperCutoff = new Date(now.getTime() - WEEKLY_KEEPER_RETENTION_DAYS * DAY_MS);
  const preClampCutoff = new Date(now.getTime() - PRE_CLAMP_RETENTION_DAYS * DAY_MS);
  const manualCutoff = new Date(now.getTime() - MANUAL_RETENTION_DAYS * DAY_MS);

  // Non-Monday daily rows older than 14 days (raw: Prisma cannot filter on
  // day-of-week).
  const dailyDeleted = await db.$executeRaw`
    DELETE FROM "EconomicSnapshot"
    WHERE "reason" = 'daily'
      AND "takenAt" < ${dailyCutoff}
      AND EXTRACT(DOW FROM "takenAt" AT TIME ZONE 'UTC') <> 1
  `;
  const keepers = await db.economicSnapshot.deleteMany({
    where: { reason: 'daily', takenAt: { lt: keeperCutoff } },
  });
  const preClamp = await db.economicSnapshot.deleteMany({
    where: { reason: 'pre-clamp', takenAt: { lt: preClampCutoff } },
  });
  const manual = await db.economicSnapshot.deleteMany({
    where: { reason: 'manual', takenAt: { lt: manualCutoff } },
  });
  return {
    dailyDeleted: typeof dailyDeleted === 'number' ? dailyDeleted : 0,
    weeklyKeepersDeleted: keepers.count,
    preClampDeleted: preClamp.count,
    manualDeleted: manual.count,
  };
}

export interface RestoreResult {
  profileId: string;
  snapshotId: string;
  takenAt: Date;
  before: { money: number; netWorth: number };
  after: { money: number; netWorth: number };
}

/**
 * ADMIN HELPER — not exposed as a route (see file header). Writes the
 * snapshot's columns back onto the profile and records a critical
 * MarketAuditLog row (`economic_snapshot_restored`) with before/after.
 *
 * Durability caveat: the game is still client-authoritative for buildings,
 * ships and research, and the client re-syncs its own state every ~30 s. A
 * restore holds for MONEY (the next sync is clamped against the restored
 * figure by clampPlausibleMoney) and, with RESOURCE_CLAMP_MODE=enforce, for
 * RESOURCES — this helper re-baselines `_resourceBaselineAt` and sets
 * `_resourceCeilings` to the restored stock so the next client claim is
 * clamped to "restored + production". Buildings/ships/research will be
 * overwritten by the client's next sync until phase 2; a restore that must
 * hold for those needs the player's local save reset as well.
 */
export async function restoreEconomicSnapshot(
  snapshotId: string,
  opts: { actor?: string; note?: string } = {},
  db: Db = prisma,
): Promise<RestoreResult> {
  const snap = await db.economicSnapshot.findUnique({ where: { id: snapshotId } });
  if (!snap) throw new Error(`EconomicSnapshot ${snapshotId} not found`);
  const profile = await db.gameProfile.findUnique({
    where: { id: snap.profileId },
    select: { id: true, money: true, netWorth: true, workforceData: true },
  });
  if (!profile) throw new Error(`GameProfile ${snap.profileId} not found`);

  const restoredResources = (snap.resources && typeof snap.resources === 'object')
    ? (snap.resources as Record<string, number>)
    : {};
  // Re-baseline so an enforced clamp anchors on the restored stock rather
  // than the (possibly inflated) pre-restore figure.
  const baseWorkforce = snap.workforceData && typeof snap.workforceData === 'object'
    ? (snap.workforceData as Record<string, unknown>)
    : (profile.workforceData && typeof profile.workforceData === 'object'
      ? (profile.workforceData as Record<string, unknown>)
      : {});
  const workforceData = {
    ...baseWorkforce,
    [RESOURCE_BASELINE_KEY]: new Date().toISOString(),
    [RESOURCE_CEILINGS_KEY]: selectCeilingsToStash(restoredResources, restoredResources),
  };

  // Phase 2: a restore re-adopts the server-owned map from the restored
  // stock and stamps every ledger row folded (the restored figure is the
  // new truth; nothing before it may be re-applied on top).
  await db.gameProfile.update({
    where: { id: profile.id },
    data: {
      money: snap.money,
      netWorth: snap.netWorth,
      resources: restoredResources as object,
      serverResources: restoredResources as object,
      buildingsData: (snap.buildingsData ?? []) as object,
      shipsData: (snap.shipsData ?? []) as object,
      completedResearchList: snap.completedResearchList,
      ...(snap.activeServicesData != null ? { activeServicesData: snap.activeServicesData as object } : {}),
      workforceData: workforceData as object,
      lastSyncAt: new Date(),
    },
  });
  try {
    await db.gameLedgerEntry.updateMany({
      where: { profileId: profile.id, foldedAt: null },
      data: { foldedAt: new Date() },
    });
  } catch { /* ledger table / column may lag deploy */ }

  const result: RestoreResult = {
    profileId: profile.id,
    snapshotId: snap.id,
    takenAt: snap.takenAt,
    before: { money: profile.money, netWorth: profile.netWorth },
    after: { money: snap.money, netWorth: snap.netWorth },
  };

  try {
    await db.marketAuditLog.create({
      data: {
        eventType: 'economic_snapshot_restored',
        profileId: profile.id,
        severity: 'critical',
        details: {
          snapshotId: snap.id,
          snapshotReason: snap.reason,
          takenAt: snap.takenAt.toISOString(),
          actor: opts.actor ?? null,
          note: opts.note ?? null,
          before: result.before,
          after: result.after,
        },
      },
    });
  } catch (error) {
    logger.error('economic_snapshot_restored audit row failed', { snapshotId, error: String(error) });
  }
  logger.warn('EconomicSnapshot restored onto profile', { ...result, actor: opts.actor ?? null });
  return result;
}

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * Docket intelligence (Regulatory Wave B, item 2) — storage/query helpers for
 * the DocketSnapshot table: per-docket public-comment activity fetched from
 * the Regulations.gov v4 API for radar actions with open comment windows.
 *
 * Privacy invariant: organization names ONLY. Individual commenters are never
 * stored — the fetcher discards comments without an organization field.
 *
 * Deployment safety: same availability-probe pattern as
 * src/lib/regulatory-radar.ts — this code may ship before `prisma db push`
 * creates the table, so every write is gated behind a cached probe and every
 * read fails soft to an empty list.
 */

export interface DocketOrganization {
  name: string;
  /** Occurrences among the sampled recent comments (a lower bound, not a docket total). */
  count: number;
}

export interface DocketSnapshotRecord {
  docketId: string;
  actionDedupKey: string;
  commentCount: number;
  organizations: DocketOrganization[];
  lastCheckedAt: Date;
}

export interface DocketSnapshotInput {
  docketId: string;
  actionDedupKey: string;
  commentCount: number;
  organizations: DocketOrganization[];
}

/** Public docket page on Regulations.gov. Pure. */
export function regulationsGovDocketUrl(docketId: string): string {
  return `https://www.regulations.gov/docket/${encodeURIComponent(docketId)}`;
}

// ─── Availability probe ──────────────────────────────────────────────────────

const PROBE_TTL_MS = 5 * 60 * 1000;
let docketTableAvailable: boolean | null = null;
let lastProbeAt = 0;

/**
 * Whether the DocketSnapshot table exists. Cached; re-probed every 5 minutes
 * while unavailable, never re-probed once available.
 */
export async function isDocketIntelAvailable(): Promise<boolean> {
  if (docketTableAvailable === true) return true;
  const now = Date.now();
  if (docketTableAvailable === false && now - lastProbeAt < PROBE_TTL_MS) return false;
  lastProbeAt = now;
  try {
    await prisma.docketSnapshot.count({ take: 1 });
    docketTableAvailable = true;
  } catch {
    docketTableAvailable = false;
    logger.warn('DocketSnapshot table unavailable — docket intel skipped (run prisma db push)');
  }
  return docketTableAvailable;
}

/** Test helper — reset the cached probe. */
export function __resetDocketIntelAvailability(): void {
  docketTableAvailable = null;
  lastProbeAt = 0;
}

// ─── Writes ──────────────────────────────────────────────────────────────────

/**
 * Idempotently upsert one docket snapshot. Never throws — returns whether a
 * row was written (false when the table isn't available yet or the write
 * fails), so the fetcher cron can never be broken by this table.
 */
export async function upsertDocketSnapshot(input: DocketSnapshotInput): Promise<boolean> {
  if (!(await isDocketIntelAvailable())) return false;
  try {
    const data = {
      actionDedupKey: input.actionDedupKey,
      commentCount: input.commentCount,
      organizations: JSON.stringify(input.organizations),
      lastCheckedAt: new Date(),
    };
    await prisma.docketSnapshot.upsert({
      where: { docketId: input.docketId },
      create: { docketId: input.docketId, ...data },
      update: data,
    });
    return true;
  } catch (error) {
    logger.error('upsertDocketSnapshot failed', {
      docketId: input.docketId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

// ─── Reads ───────────────────────────────────────────────────────────────────

function parseOrganizations(json: string): DocketOrganization[] {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((o): o is DocketOrganization => !!o && typeof o.name === 'string' && o.name.trim().length > 0)
      .map((o) => ({ name: o.name, count: typeof o.count === 'number' && o.count > 0 ? o.count : 1 }));
  } catch {
    return [];
  }
}

/**
 * Snapshots for one radar action (matched by dedupKey) — powers the "Who's
 * commenting" block on the action detail page. Fails soft to [].
 */
export async function getDocketSnapshotsForAction(actionDedupKey: string): Promise<DocketSnapshotRecord[]> {
  try {
    const rows = await prisma.docketSnapshot.findMany({
      where: { actionDedupKey },
      orderBy: { commentCount: 'desc' },
      take: 5,
    });
    return rows.map((row) => ({
      docketId: row.docketId,
      actionDedupKey: row.actionDedupKey,
      commentCount: row.commentCount,
      organizations: parseOrganizations(row.organizations),
      lastCheckedAt: row.lastCheckedAt,
    }));
  } catch {
    return [];
  }
}

/**
 * Recently-refreshed docket activity, busiest dockets first — powers the
 * weekly brief's docket-activity lines. Fails soft to [].
 */
export async function getRecentDocketActivity(withinDays = 7, limit = 5, now = new Date()): Promise<DocketSnapshotRecord[]> {
  try {
    const since = new Date(now.getTime() - withinDays * 24 * 60 * 60 * 1000);
    const rows = await prisma.docketSnapshot.findMany({
      where: { lastCheckedAt: { gte: since }, commentCount: { gt: 0 } },
      orderBy: { commentCount: 'desc' },
      take: Math.min(Math.max(limit, 1), 20),
    });
    return rows.map((row) => ({
      docketId: row.docketId,
      actionDedupKey: row.actionDedupKey,
      commentCount: row.commentCount,
      organizations: parseOrganizations(row.organizations),
      lastCheckedAt: row.lastCheckedAt,
    }));
  } catch {
    return [];
  }
}

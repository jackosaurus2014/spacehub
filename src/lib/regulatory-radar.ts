import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import type { RadarCategory } from '@/lib/regulatory-categorizer';

/**
 * Regulatory Radar — shared storage/query helpers for the RegulatoryAction
 * table (prisma/schema.prisma).
 *
 * Deployment safety: this code may ship before `prisma db push` creates the
 * RegulatoryAction table (the Railway build container has no DB access, and
 * schema pushes happen at coordinator gate time). Every write is gated
 * behind a cached availability probe (same pattern as
 * src/lib/published-briefs.ts) and every read fails soft to an empty list,
 * so a missing table never breaks a fetcher cron or a page render.
 */

export type RadarSource = 'congress' | 'federal-register' | 'faa' | 'fcc' | 'itu' | 'sec';

export interface RadarEntryInput {
  /** Stable unique key, e.g. "federal-register:2026-12345" or "congress:119-hr-1234:2026-08-01". */
  dedupKey: string;
  source: RadarSource;
  category: RadarCategory;
  title: string;
  summary?: string | null;
  actionDate: Date;
  url: string;
  agency?: string | null;
  documentType?: string | null;
  actionText?: string | null;
  commentUrl?: string | null;
  commentCloseDate?: Date | null;
  /** When a rule takes effect (FR effective_on). Written only once the column exists. */
  effectiveDate?: Date | null;
  significant?: boolean;
  raw?: unknown;
}

export interface RadarEntry {
  id: string;
  dedupKey: string;
  source: RadarSource;
  category: RadarCategory;
  title: string;
  summary: string | null;
  actionDate: Date;
  url: string;
  agency: string | null;
  documentType: string | null;
  actionText: string | null;
  commentUrl: string | null;
  commentCloseDate: Date | null;
  significant: boolean;
}

// ─── Availability probe ──────────────────────────────────────────────────────

const PROBE_TTL_MS = 5 * 60 * 1000;
let radarTableAvailable: boolean | null = null;
let lastProbeAt = 0;

/**
 * Whether the RegulatoryAction table exists. Cached; re-probed every 5
 * minutes while unavailable (so it flips on shortly after the migration
 * runs) and never re-probed once available.
 */
export async function isRegulatoryRadarAvailable(): Promise<boolean> {
  if (radarTableAvailable === true) return true;
  const now = Date.now();
  if (radarTableAvailable === false && now - lastProbeAt < PROBE_TTL_MS) return false;
  lastProbeAt = now;
  try {
    await prisma.regulatoryAction.count({ take: 1 });
    radarTableAvailable = true;
  } catch {
    radarTableAvailable = false;
    logger.warn('RegulatoryAction table unavailable — radar writes skipped (run prisma db push)');
  }
  return radarTableAvailable;
}

// The effectiveDate column shipped after the table itself (Regulatory Wave A)
// — between deploy and `prisma db push` the generated client knows a column
// the database doesn't have. Writes and effective-date reads are gated behind
// their own probe so the base radar keeps working untouched in that window.
let effectiveDateColumnAvailable: boolean | null = null;
let lastColumnProbeAt = 0;

export async function isEffectiveDateColumnAvailable(): Promise<boolean> {
  if (effectiveDateColumnAvailable === true) return true;
  const now = Date.now();
  if (effectiveDateColumnAvailable === false && now - lastColumnProbeAt < PROBE_TTL_MS) return false;
  lastColumnProbeAt = now;
  try {
    await prisma.regulatoryAction.findFirst({ select: { effectiveDate: true } });
    effectiveDateColumnAvailable = true;
  } catch {
    effectiveDateColumnAvailable = false;
    logger.warn('RegulatoryAction.effectiveDate column unavailable — effective dates skipped (run prisma db push)');
  }
  return effectiveDateColumnAvailable;
}

/** Test helper — reset the cached probe. */
export function __resetRegulatoryRadarAvailability(): void {
  radarTableAvailable = null;
  lastProbeAt = 0;
  effectiveDateColumnAvailable = null;
  lastColumnProbeAt = 0;
}

// ─── Writes ──────────────────────────────────────────────────────────────────

/**
 * Idempotently upserts radar entries by dedupKey. Never throws — returns the
 * number of rows written (0 when the table isn't available yet), so fetcher
 * crons that dual-write here can never be broken by the radar table.
 */
export async function upsertRadarEntries(entries: RadarEntryInput[]): Promise<number> {
  if (entries.length === 0) return 0;
  if (!(await isRegulatoryRadarAvailable())) return 0;
  const withEffectiveDate = await isEffectiveDateColumnAvailable();

  let written = 0;
  for (const entry of entries) {
    try {
      const data = {
        ...(withEffectiveDate ? { effectiveDate: entry.effectiveDate ?? null } : {}),
        source: entry.source,
        category: entry.category,
        title: entry.title,
        summary: entry.summary ?? null,
        actionDate: entry.actionDate,
        url: entry.url,
        agency: entry.agency ?? null,
        documentType: entry.documentType ?? null,
        actionText: entry.actionText ?? null,
        commentUrl: entry.commentUrl ?? null,
        commentCloseDate: entry.commentCloseDate ?? null,
        significant: entry.significant ?? false,
        raw: entry.raw !== undefined ? JSON.stringify(entry.raw) : null,
      };
      await prisma.regulatoryAction.upsert({
        where: { dedupKey: entry.dedupKey },
        create: { dedupKey: entry.dedupKey, ...data },
        update: data,
      });
      written++;
    } catch (error) {
      logger.error('upsertRadarEntries: upsert failed', {
        dedupKey: entry.dedupKey,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return written;
}

// ─── Reads ───────────────────────────────────────────────────────────────────

export interface RadarTimelineOptions {
  limit?: number;
  category?: RadarCategory;
  source?: RadarSource;
  since?: Date;
}

const RADAR_SELECT = {
  id: true,
  dedupKey: true,
  source: true,
  category: true,
  title: true,
  summary: true,
  actionDate: true,
  url: true,
  agency: true,
  documentType: true,
  actionText: true,
  commentUrl: true,
  commentCloseDate: true,
  significant: true,
} as const;

/**
 * Reverse-chronological unified timeline across sources. Fails soft to []
 * when the table doesn't exist yet or the query errors.
 */
export async function getRadarTimeline(options: RadarTimelineOptions = {}): Promise<RadarEntry[]> {
  const { limit = 50, category, source, since } = options;
  try {
    const rows = await prisma.regulatoryAction.findMany({
      where: {
        ...(category ? { category } : {}),
        ...(source ? { source } : {}),
        ...(since ? { actionDate: { gte: since } } : {}),
      },
      orderBy: { actionDate: 'desc' },
      take: Math.min(Math.max(limit, 1), 200),
      select: RADAR_SELECT,
    });
    return rows as RadarEntry[];
  } catch {
    return [];
  }
}

/**
 * Actions with a comment window still open, ordered by soonest close date.
 * "Open for comment, closes in N days" is the most actionable signal on the
 * radar for business users. Fails soft to [].
 */
export async function getClosingCommentWindows(withinDays = 30, now = new Date()): Promise<RadarEntry[]> {
  try {
    const horizon = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);
    const rows = await prisma.regulatoryAction.findMany({
      where: {
        commentCloseDate: { gte: now, lte: horizon },
      },
      orderBy: { commentCloseDate: 'asc' },
      take: 40, // callers slice; the 90-day compliance calendar needs the fuller window
      select: RADAR_SELECT,
    });
    return rows as RadarEntry[];
  } catch {
    return [];
  }
}

/** Whole days until a date (>= 0), for "closes in N days" copy. */
export function daysUntil(date: Date, now = new Date()): number {
  return Math.max(0, Math.ceil((date.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
}

/** RadarEntry plus the rule's effective date (compliance-calendar read). */
export interface RadarEffectiveEntry extends RadarEntry {
  effectiveDate: Date;
}

/**
 * Rules whose effective date falls in the next `withinDays`, soonest first.
 * Fails soft to [] both while the table is missing AND while the
 * effectiveDate column hasn't been pushed yet (its own probe), so this can
 * never blank the rest of the radar.
 */
export async function getUpcomingEffectiveDates(withinDays = 90, now = new Date()): Promise<RadarEffectiveEntry[]> {
  try {
    if (!(await isEffectiveDateColumnAvailable())) return [];
    const horizon = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);
    const rows = await prisma.regulatoryAction.findMany({
      where: { effectiveDate: { gte: now, lte: horizon } },
      orderBy: { effectiveDate: 'asc' },
      take: 40,
      select: { ...RADAR_SELECT, effectiveDate: true },
    });
    return rows.filter((r) => r.effectiveDate) as RadarEffectiveEntry[];
  } catch {
    return [];
  }
}

/** Single entry by id, for the /regulatory-radar/action/[id] detail page. Fails soft to null. */
export async function getRadarEntryById(id: string): Promise<RadarEntry | null> {
  if (!id || id.length > 64 || !/^[a-z0-9]+$/i.test(id)) return null;
  try {
    const row = await prisma.regulatoryAction.findUnique({
      where: { id },
      select: RADAR_SELECT,
    });
    return (row as RadarEntry) || null;
  } catch {
    return null;
  }
}

/**
 * Newest actions in any of the given categories — powers the "Related
 * regulatory actions" strip on article pages. Fails soft to [].
 */
export async function getRecentActionsByCategories(
  categories: RadarCategory[],
  limit = 3,
  withinDays = 180,
  now = new Date()
): Promise<RadarEntry[]> {
  if (categories.length === 0) return [];
  try {
    const since = new Date(now.getTime() - withinDays * 24 * 60 * 60 * 1000);
    const rows = await prisma.regulatoryAction.findMany({
      where: { category: { in: categories }, actionDate: { gte: since } },
      orderBy: { actionDate: 'desc' },
      take: Math.min(Math.max(limit, 1), 10),
      select: RADAR_SELECT,
    });
    return rows as RadarEntry[];
  } catch {
    return [];
  }
}

/**
 * Query + assemble the next-90-days compliance calendar (comment closings +
 * rule effective dates). Fails soft to [] at every layer (missing table,
 * missing effectiveDate column, query errors). Assembly itself is pure —
 * see src/lib/regulatory-deadlines.ts.
 */
export async function collectRegulatoryDeadlines(
  now = new Date(),
  horizonDays = 90
): Promise<import('@/lib/regulatory-deadlines').RegulatoryDeadlineItem[]> {
  const { assembleRegulatoryDeadlines } = await import('@/lib/regulatory-deadlines');
  const [commentWindows, effectiveEntries] = await Promise.all([
    getClosingCommentWindows(horizonDays, now),
    getUpcomingEffectiveDates(horizonDays, now),
  ]);
  return assembleRegulatoryDeadlines(commentWindows, effectiveEntries, now, horizonDays);
}

/** Significant entries for sitemap inclusion (id + actionDate only). Fails soft to []. */
export async function getSignificantEntryIds(limit = 200): Promise<Array<{ id: string; actionDate: Date }>> {
  try {
    return await prisma.regulatoryAction.findMany({
      where: { significant: true },
      orderBy: { actionDate: 'desc' },
      take: limit,
      select: { id: true, actionDate: true },
    });
  } catch {
    return [];
  }
}

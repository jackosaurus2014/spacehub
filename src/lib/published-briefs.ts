import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * Unified published-brief hub — shared helpers for PublishedBrief.
 *
 * Consolidates the previously-separate /intelligence-brief (hardcoded
 * array), /newsletter-archive (hardcoded array), and the weekly
 * economy/hiring AIInsight-backed digests into one DB-backed table. Rows
 * arrive two ways:
 *   1. scripts/backfill-published-briefs.ts — one-time idempotent migration
 *      of the legacy hardcoded arrays plus a mirror pass over existing
 *      AIInsight rows.
 *   2. mirrorInsightAsBrief() below — called by the weekly economy/hiring
 *      cron routes every time they publish a new AIInsight, so the brief
 *      hub stays current going forward with no manual step.
 *
 * Deployment safety: this code may ship before `prisma db push` creates the
 * PublishedBrief table. Mirror writes are gated behind a cached
 * availability probe (same table-probe pattern as
 * src/lib/game/server-ledger.ts's isLedgerAvailable) so a missing table
 * never breaks the underlying AIInsight-publishing cron — it just skips
 * the mirror until the table exists.
 */

export type BriefType = 'weekly_intelligence' | 'economy' | 'hiring' | 'regulatory' | 'special';

// ─── Availability probe ──────────────────────────────────────────────────────

const PROBE_TTL_MS = 5 * 60 * 1000;
let briefTableAvailable: boolean | null = null;
let lastProbeAt = 0;

/**
 * Whether the PublishedBrief table exists. Cached; re-probed every 5
 * minutes while unavailable (so it flips on shortly after the migration
 * runs) and never re-probed once available.
 */
export async function isPublishedBriefAvailable(): Promise<boolean> {
  if (briefTableAvailable === true) return true;
  const now = Date.now();
  if (briefTableAvailable === false && now - lastProbeAt < PROBE_TTL_MS) return false;
  lastProbeAt = now;
  try {
    await prisma.publishedBrief.count({ take: 1 });
    briefTableAvailable = true;
  } catch {
    briefTableAvailable = false;
    logger.warn('PublishedBrief table unavailable — brief mirror skipped (run prisma db push)');
  }
  return briefTableAvailable;
}

/** Test helper — reset the cached probe. */
export function __resetPublishedBriefAvailability(): void {
  briefTableAvailable = null;
  lastProbeAt = 0;
}

// ─── Mirror writer ────────────────────────────────────────────────────────────

export interface MirrorInsightInput {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  publishedAt: Date;
  briefType: BriefType;
}

/**
 * Upserts a PublishedBrief row mirroring an AIInsight that a weekly cron
 * just published (or already found published — the crons call this on
 * both the "created" and "already exists" paths so re-running a cron after
 * this table shipped still backfills the mirror). Idempotent by slug.
 *
 * Never throws — returns false if the table isn't available yet or the
 * write fails for any other reason, so this can never break the
 * AIInsight-publishing cron it's called from.
 */
export async function mirrorInsightAsBrief(input: MirrorInsightInput): Promise<boolean> {
  if (!(await isPublishedBriefAvailable())) return false;

  try {
    await prisma.publishedBrief.upsert({
      where: { slug: input.slug },
      create: {
        slug: input.slug,
        title: input.title,
        briefType: input.briefType,
        summary: input.summary,
        contentMd: input.content,
        publishedAt: input.publishedAt,
        sourceInsightId: input.id,
      },
      update: {
        title: input.title,
        summary: input.summary,
        contentMd: input.content,
        publishedAt: input.publishedAt,
        sourceInsightId: input.id,
      },
    });
    return true;
  } catch (error) {
    logger.error('mirrorInsightAsBrief: upsert failed', {
      slug: input.slug,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

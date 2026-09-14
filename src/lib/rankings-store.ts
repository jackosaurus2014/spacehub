/**
 * Edition archive for the quarterly Space Score Top 25.
 *
 * WHY THIS EXISTS
 * ---------------
 * src/lib/space-score.ts holds a hand-maintained score table with no history:
 * it only ever describes "now". A quarterly ranking needs to know what the
 * PREVIOUS edition said, or it cannot honestly show movement — and the one
 * rule of this feature (see src/lib/rankings.ts) is that it must never invent
 * movement. So each edition's ordering is snapshotted the first time that
 * quarter is rendered, and the next quarter compares against the snapshot
 * rather than against a re-derivation of today's table.
 *
 * Storage is the existing DynamicContent key/value table — no schema change.
 * The monthly fastest-hiring ranking needs none of this: its source
 * (CompanyJobSnapshot, via getHiringIndex) already holds real month history.
 */

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

const MODULE = 'rankings';
const SECTION = 'space-score-top-25';

export interface StoredRankingRow {
  /** Cross-edition identity (rowKey()). */
  key: string;
  rank: number;
  slug: string | null;
  name: string;
  total: number;
}

export interface StoredRankingEdition {
  edition: string; // '2026-Q3'
  capturedAt: string; // ISO
  rows: StoredRankingRow[];
}

function contentKey(edition: string): string {
  return `ranking:space-score-top-25:${edition}`;
}

function isStoredEdition(v: unknown): v is StoredRankingEdition {
  if (!v || typeof v !== 'object') return false;
  const e = v as StoredRankingEdition;
  return typeof e.edition === 'string' && Array.isArray(e.rows);
}

/** The archived edition for a quarter, or null when none was ever stored. */
export async function readSpaceScoreEdition(edition: string): Promise<StoredRankingEdition | null> {
  try {
    const row = await prisma.dynamicContent.findUnique({
      where: { contentKey: contentKey(edition) },
      select: { data: true },
    });
    if (!row) return null;
    const parsed = JSON.parse(row.data) as unknown;
    return isStoredEdition(parsed) ? parsed : null;
  } catch (error) {
    // A read failure must never break the page — it degrades to "no previous
    // edition", which renders honest copy rather than fabricated deltas.
    logger.error('Ranking edition read failed', {
      edition,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Persist (or refresh) an edition snapshot. While a quarter is still open the
 * snapshot is rewritten on each revalidation, so what freezes at quarter end
 * is the last state of the table inside that quarter.
 */
export async function saveSpaceScoreEdition(snapshot: StoredRankingEdition): Promise<void> {
  const key = contentKey(snapshot.edition);
  const farFuture = new Date();
  farFuture.setFullYear(farFuture.getFullYear() + 20);
  try {
    await prisma.dynamicContent.upsert({
      where: { contentKey: key },
      update: { data: JSON.stringify(snapshot), refreshedAt: new Date() },
      create: {
        contentKey: key,
        module: MODULE,
        section: SECTION,
        data: JSON.stringify(snapshot),
        sourceType: 'calculation',
        expiresAt: farFuture,
      },
    });
  } catch (error) {
    logger.error('Ranking edition write failed', {
      edition: snapshot.edition,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

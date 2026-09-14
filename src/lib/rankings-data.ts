/**
 * Edition builders for the two recurring rankings (competitor review #9).
 *
 * Pure ordering/delta logic lives in src/lib/rankings.ts and is unit-tested
 * without a database; this module is the thin impure layer that feeds it real
 * data and archives the quarterly edition.
 */

import { getLeaderboard, type CompanyScoreEntry } from '@/lib/space-score';
import {
  getHiringIndex,
  parseMonthParam,
  monthLabelOf,
  EARLIEST_INDEX_MONTH,
  type HiringIndexMover,
} from '@/lib/hiring-index';
import {
  applyRankDeltas,
  rankBy,
  rowKey,
  previousQuarterKey,
  previousMonthKey,
  parseQuarterParam,
  quarterOf,
  EARLIEST_SPACE_SCORE_QUARTER,
  type DeltaResult,
} from '@/lib/rankings';
import { readSpaceScoreEdition, saveSpaceScoreEdition, type StoredRankingEdition } from '@/lib/rankings-store';

export const SPACE_SCORE_TOP_N = 25;

// ── Space Score Top 25 (quarterly) ────────────────────────────────────────

export interface SpaceScoreRankEntry {
  slug: string | null;
  name: string;
  sector: string | null;
  total: number;
  tierLabel: string;
}

export interface SpaceScoreEdition {
  edition: string;
  /** Where the ranked rows came from. */
  rows: DeltaResult<SpaceScoreRankEntry>['rows'];
  hasPrevious: boolean;
  previousEdition: string | null;
  /** Companies scored in the source table (the pool the top 25 came from). */
  poolSize: number;
  /** When the underlying score table was last revised. */
  scoresUpdatedAt: string | null;
  /** True when the archived snapshot for a closed quarter was missing and the
   *  table had to be reconstructed from today's scores. Rendered as a caveat. */
  reconstructed: boolean;
  generatedAt: string;
}

function toRankEntry(e: CompanyScoreEntry): SpaceScoreRankEntry {
  return {
    slug: e.slug,
    name: e.name,
    sector: e.sector,
    total: e.score.total,
    tierLabel: e.score.tier.label,
  };
}

/**
 * Build (and archive) one quarterly edition.
 *
 * The CURRENT quarter is live: it is recomputed from the score table on every
 * revalidation and the archive row is refreshed, so what freezes when the
 * quarter ends is the table as it last stood inside that quarter. A CLOSED
 * quarter is served from its archive; if no archive exists (we shipped the
 * feature after that quarter ended) it is reconstructed and flagged as such
 * rather than presented as a contemporaneous record.
 */
export async function getSpaceScoreEdition(
  editionKey: string,
  now: Date = new Date(),
): Promise<SpaceScoreEdition | null> {
  const parsed = parseQuarterParam(editionKey);
  if (!parsed || parsed.key < EARLIEST_SPACE_SCORE_QUARTER) return null;
  const currentQuarter = quarterOf(now).key;
  if (parsed.key > currentQuarter) return null;

  const leaderboard = getLeaderboard();
  const poolSize = leaderboard.length;
  const scoresUpdatedAt = leaderboard[0]?.score.updatedAt ?? null;

  const stored = await readSpaceScoreEdition(parsed.key);
  const isCurrent = parsed.key === currentQuarter;

  let ranked;
  let reconstructed = false;

  if (!isCurrent && stored) {
    // Closed quarter with an archive: serve exactly what was published.
    const byKey = new Map(leaderboard.map((e) => [rowKey(e), e]));
    ranked = stored.rows
      .slice()
      .sort((a, b) => a.rank - b.rank)
      .map((r) => {
        const live = byKey.get(r.key);
        return {
          rank: r.rank,
          entry: {
            slug: r.slug,
            name: r.name,
            sector: live?.sector ?? null,
            total: r.total,
            tierLabel: live?.score.tier.label ?? '',
          } as SpaceScoreRankEntry,
        };
      });
  } else {
    ranked = rankBy(leaderboard.map(toRankEntry), (e) => e.total, { limit: SPACE_SCORE_TOP_N });
    reconstructed = !isCurrent;
  }

  const prevKey = previousQuarterKey(parsed.key);
  const prevStored =
    prevKey && prevKey >= EARLIEST_SPACE_SCORE_QUARTER ? await readSpaceScoreEdition(prevKey) : null;

  const withDeltas = applyRankDeltas(
    ranked,
    prevStored ? prevStored.rows.map((r) => ({ rank: r.rank, key: r.key })) : null,
  );

  // Archive the live quarter (and any reconstruction) so the NEXT edition has
  // something real to compare against. Never blocks the render.
  const snapshot: StoredRankingEdition = {
    edition: parsed.key,
    capturedAt: stored?.capturedAt ?? new Date().toISOString(),
    rows: ranked.map((r) => ({
      key: rowKey(r.entry),
      rank: r.rank,
      slug: r.entry.slug,
      name: r.entry.name,
      total: r.entry.total,
    })),
  };
  if (isCurrent || !stored) {
    await saveSpaceScoreEdition(snapshot);
  }

  return {
    edition: parsed.key,
    rows: withDeltas.rows,
    hasPrevious: withDeltas.hasPrevious,
    previousEdition: prevStored ? prevKey : null,
    poolSize,
    scoresUpdatedAt,
    reconstructed,
    generatedAt: new Date().toISOString(),
  };
}

// ── Fastest-hiring companies (monthly) ────────────────────────────────────

export interface FastestHiringEntry {
  slug: string | null;
  name: string;
  /** Net roles added across the month. */
  change: number;
  first: number;
  last: number;
  percentChange: number | null;
  firstDate: string;
  lastDate: string;
}

export interface FastestHiringEdition {
  edition: string;
  monthLabel: string;
  rows: DeltaResult<FastestHiringEntry>['rows'];
  hasPrevious: boolean;
  previousEdition: string | null;
  /** Site-wide active postings at month end (context, not a ranking input). */
  activeAtMonthEnd: number | null;
  generatedAt: string;
}

function toHiringEntry(m: HiringIndexMover): FastestHiringEntry {
  return {
    slug: m.slug,
    name: m.companyName,
    change: m.change,
    first: m.first,
    last: m.last,
    percentChange: m.percentChange,
    firstDate: m.firstDate,
    lastDate: m.lastDate,
  };
}

/** Rank a month's gainers. Exported for tests (pure given its input). */
export function rankHiringGainers(movers: HiringIndexMover[]) {
  return rankBy(movers.map(toHiringEntry), (e) => e.change, {
    tieBreak: (e) => e.percentChange,
  });
}

export async function getFastestHiringEdition(editionKey: string): Promise<FastestHiringEdition | null> {
  const parsed = parseMonthParam(editionKey);
  if (!parsed || editionKey < EARLIEST_INDEX_MONTH) return null;

  const index = await getHiringIndex(parsed.year, parsed.month);
  if (!index) return null;

  const ranked = rankHiringGainers(index.movers.gainers);

  // Previous edition: only real if the previous month is itself a published
  // edition AND has data. No prior month => no deltas, and the page says so.
  const prevKey = previousMonthKey(editionKey);
  let previous: { rank: number; key: string }[] | null = null;
  let previousEdition: string | null = null;
  if (prevKey && prevKey >= EARLIEST_INDEX_MONTH) {
    const prevParsed = parseMonthParam(prevKey);
    const prevIndex = prevParsed ? await getHiringIndex(prevParsed.year, prevParsed.month) : null;
    if (prevIndex && prevIndex.movers.gainers.length > 0) {
      previous = rankHiringGainers(prevIndex.movers.gainers).map((r) => ({
        rank: r.rank,
        key: rowKey(r.entry),
      }));
      previousEdition = prevKey;
    }
  }

  const withDeltas = applyRankDeltas(ranked, previous);

  return {
    edition: editionKey,
    monthLabel: monthLabelOf(parsed.year, parsed.month),
    rows: withDeltas.rows,
    hasPrevious: withDeltas.hasPrevious,
    previousEdition,
    activeAtMonthEnd: index.activeAtMonthEnd ?? index.activeNow,
    generatedAt: index.generatedAt,
  };
}

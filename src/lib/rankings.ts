/**
 * Recurring rankings — dated, linkable league tables (competitor review
 * 2026-09-10, Tier 2 #9: "Awards / rankings as recurring content").
 *
 * Two families, both built from data we already hold:
 *   /rankings/space-score-top-25/<YYYY-Qn>  quarterly, from src/lib/space-score.ts
 *   /rankings/fastest-hiring/<YYYY-MM>      monthly,   from src/lib/hiring-index.ts
 *
 * THE ONE RULE THIS FILE ENFORCES
 * -------------------------------
 * A ranking must never invent movement. Rank deltas exist only when a
 * PREVIOUS EDITION actually exists; on a first edition every delta is null
 * and the page says "first edition" rather than painting every row green.
 * applyRankDeltas() is the single place that decision is made, and it is
 * asserted in src/lib/__tests__/rankings.test.ts.
 *
 * Everything here is pure: no DB, no Date.now() except where a `now` is
 * passed in. That keeps the ordering, tie-break and delta logic testable
 * without a database.
 */

// ── Quarter arithmetic ────────────────────────────────────────────────────

/** 'YYYY-Qn', e.g. '2026-Q3'. */
export const QUARTER_RE = /^(\d{4})-Q([1-4])$/;

/**
 * First Space Score edition. The score table itself
 * (src/lib/space-score.ts, ALL_COMPANY_SCORES) is a hand-maintained
 * snapshot; this is the first quarter we publish a ranking off it.
 */
export const EARLIEST_SPACE_SCORE_QUARTER = '2026-Q3';

export interface Quarter {
  year: number;
  /** 1-4. */
  quarter: number;
  key: string;
}

export function quarterKey(year: number, quarter: number): string {
  return `${year}-Q${quarter}`;
}

/** The quarter a date falls in (UTC). */
export function quarterOf(now: Date = new Date()): Quarter {
  const year = now.getUTCFullYear();
  const quarter = Math.floor(now.getUTCMonth() / 3) + 1;
  return { year, quarter, key: quarterKey(year, quarter) };
}

/** Strict 'YYYY-Qn' parse; null on anything malformed. */
export function parseQuarterParam(param: string): Quarter | null {
  const m = QUARTER_RE.exec(param);
  if (!m) return null;
  const year = Number(m[1]);
  const quarter = Number(m[2]);
  if (year < 2000 || year > 2100) return null;
  return { year, quarter, key: quarterKey(year, quarter) };
}

export function previousQuarterKey(key: string): string | null {
  const q = parseQuarterParam(key);
  if (!q) return null;
  return q.quarter === 1 ? quarterKey(q.year - 1, 4) : quarterKey(q.year, q.quarter - 1);
}

export function quarterLabel(key: string): string {
  const q = parseQuarterParam(key);
  if (!q) return key;
  const start = new Date(Date.UTC(q.year, (q.quarter - 1) * 3, 1));
  const end = new Date(Date.UTC(q.year, q.quarter * 3, 0));
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  return `Q${q.quarter} ${q.year} (${fmt(start)}–${fmt(end)})`;
}

export function quarterShortLabel(key: string): string {
  const q = parseQuarterParam(key);
  return q ? `Q${q.quarter} ${q.year}` : key;
}

/**
 * The edition /rankings/space-score-top-25 redirects to: the CURRENT quarter
 * (the table is live through the quarter and freezes when the quarter ends),
 * clamped so it is never earlier than the first edition.
 */
export function latestSpaceScoreQuarter(now: Date = new Date()): string {
  const cur = quarterOf(now).key;
  return cur < EARLIEST_SPACE_SCORE_QUARTER ? EARLIEST_SPACE_SCORE_QUARTER : cur;
}

/** Every published quarter key, oldest first. */
export function spaceScoreQuarterKeys(now: Date = new Date()): string[] {
  const out: string[] = [];
  const last = latestSpaceScoreQuarter(now);
  // Walk forward from the earliest; bounded by 200 iterations as a guard.
  let cursor = parseQuarterParam(EARLIEST_SPACE_SCORE_QUARTER);
  for (let i = 0; cursor && i < 200; i++) {
    out.push(cursor.key);
    if (cursor.key === last) break;
    cursor =
      cursor.quarter === 4
        ? parseQuarterParam(quarterKey(cursor.year + 1, 1))
        : parseQuarterParam(quarterKey(cursor.year, cursor.quarter + 1));
  }
  return out;
}

// ── Month arithmetic (fastest-hiring reuses hiring-index's month keys) ────

export function previousMonthKey(key: string): string | null {
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return month === 1
    ? `${year - 1}-12`
    : `${year}-${String(month - 1).padStart(2, '0')}`;
}

export function monthKeysBetween(earliest: string, latest: string): string[] {
  const out: string[] = [];
  let cursor = latest;
  for (let i = 0; cursor && cursor >= earliest && i < 240; i++) {
    out.unshift(cursor);
    const prev = previousMonthKey(cursor);
    if (!prev) break;
    cursor = prev;
  }
  return out;
}

// ── Ranking primitives ────────────────────────────────────────────────────

export interface RankableCompany {
  slug: string | null;
  name: string;
}

export interface RankedRow<T extends RankableCompany> {
  rank: number;
  entry: T;
}

/**
 * Deterministic ranking. Higher `value` ranks first; ties break on
 * `tieBreak` (higher first, nulls last) and then on name (A-Z), so the same
 * inputs always produce the same table — a ranking whose order wobbles
 * between renders cannot be cited.
 */
export function rankBy<T extends RankableCompany>(
  entries: T[],
  value: (e: T) => number,
  opts: { tieBreak?: (e: T) => number | null; limit?: number } = {},
): RankedRow<T>[] {
  const tieBreak = opts.tieBreak ?? (() => null);
  const sorted = [...entries].sort((a, b) => {
    const dv = value(b) - value(a);
    if (dv !== 0) return dv;
    const ta = tieBreak(a);
    const tb = tieBreak(b);
    if (ta !== tb) {
      if (ta === null) return 1;
      if (tb === null) return -1;
      return tb - ta;
    }
    return a.name.localeCompare(b.name);
  });
  const limited = opts.limit != null ? sorted.slice(0, opts.limit) : sorted;
  return limited.map((entry, i) => ({ rank: i + 1, entry }));
}

export interface RankDelta {
  /** Rank in the previous edition, or null when there is no previous edition
   *  (or the company was absent from it). */
  previousRank: number | null;
  /** Positions gained (positive) or lost (negative); null when unknown. */
  delta: number | null;
  /** True only when a previous edition EXISTS and this row was not in it. */
  isNew: boolean;
}

export interface DeltaResult<T extends RankableCompany> {
  rows: (RankedRow<T> & RankDelta)[];
  /** False on a first edition — pages must render "first edition" copy. */
  hasPrevious: boolean;
}

/**
 * Attach rank movement, honestly.
 *
 * previous === null means "no previous edition was published". In that case
 * every delta is null, isNew is false for every row (nothing is "new" when
 * there is nothing to be new against), and hasPrevious is false.
 */
export function applyRankDeltas<T extends RankableCompany>(
  current: RankedRow<T>[],
  previous: { rank: number; key: string }[] | null,
): DeltaResult<T> {
  if (!previous) {
    return {
      rows: current.map((r) => ({ ...r, previousRank: null, delta: null, isNew: false })),
      hasPrevious: false,
    };
  }
  const byKey = new Map(previous.map((p) => [p.key, p.rank]));
  return {
    rows: current.map((r) => {
      const key = rowKey(r.entry);
      const previousRank = byKey.get(key) ?? null;
      return {
        ...r,
        previousRank,
        delta: previousRank == null ? null : previousRank - r.rank,
        isNew: previousRank == null,
      };
    }),
    hasPrevious: true,
  };
}

/** Identity used to match a company across editions. */
export function rowKey(entry: RankableCompany): string {
  return (entry.slug ?? entry.name).toLowerCase();
}

/** Human label for a delta, never inventing movement. */
export function deltaLabel(d: RankDelta): string {
  if (d.delta == null) return d.isNew ? 'New entry' : 'No prior edition';
  if (d.delta === 0) return 'Unchanged';
  return d.delta > 0 ? `Up ${d.delta}` : `Down ${Math.abs(d.delta)}`;
}

// ── Methodology copy (rendered on the pages, asserted in tests) ───────────

export const SPACE_SCORE_TOP_25_METHODOLOGY: readonly string[] = [
  'The Space Score is a composite 0–1000 rating across five equally weighted dimensions worth 200 points each: Innovation, Financial Health, Market Position, Operational Capacity and Growth Trajectory.',
  'Scores are assigned to a fixed roster of tracked space companies from public data — funding and valuation disclosures, headcount ranges, contract awards, product and facility counts, and public-market capitalisation where the company is listed.',
  'This table ranks the top 25 by total score. Ties break on company name (A–Z), so the order is reproducible.',
  'Private companies are scored on disclosed figures only. Where a company discloses nothing in a dimension, it scores low in that dimension — the score measures the evidence available, not management quality.',
  'Editions are quarterly and dated. A company’s position can only move when the underlying score table is revised; when nothing has been revised since the previous edition, the movement column says so instead of showing zeroes as though they were news.',
  'This is not investment advice. The Space Score is a descriptive composite, not a forecast or a recommendation.',
];

export const FASTEST_HIRING_METHODOLOGY: readonly string[] = [
  'Built from SpaceNexus’s daily snapshot of live job postings across tracked space-company applicant-tracking systems. Every company’s open-role count is recorded once a day.',
  'A company’s monthly figure is the change between its FIRST and LAST snapshot inside the calendar month — net roles added, not gross postings, so a company that opened and filled ten roles in the month does not appear to have grown.',
  'Only companies holding at least five open roles at the end of the month are ranked, and only companies with at least two snapshots inside the month — below that, a two-role swing is noise rather than a hiring signal, and a single snapshot has no change to measure.',
  'Ranking is by net roles added, descending. Ties break on percentage growth, then on company name (A–Z). Each edition publishes the qualifying gainers carried by that month’s Hiring Index (up to eight).',
  'Coverage changes are flagged, not hidden: when a company’s board newly joins the tracker inside a month, its first snapshot is the day we started watching it, so its apparent growth is coverage rather than hiring. Any coverage change falling inside the month is named on the page.',
  'Editions are monthly and dated. Rank movement is measured only against the previous month’s edition of this same table.',
];

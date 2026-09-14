/**
 * @jest-environment node
 */
/**
 * Recurring rankings (competitor review 2026-09-10, Tier 2 #9).
 *
 * The load-bearing assertion here is the honesty rule: a ranking must never
 * invent movement. With no previous edition every delta is null, nothing is
 * flagged "new", and the page copy that depends on hasPrevious stays on the
 * "first edition" branch.
 */

import {
  QUARTER_RE,
  parseQuarterParam,
  quarterOf,
  quarterKey,
  quarterLabel,
  quarterShortLabel,
  previousQuarterKey,
  previousMonthKey,
  monthKeysBetween,
  latestSpaceScoreQuarter,
  spaceScoreQuarterKeys,
  rankBy,
  applyRankDeltas,
  rowKey,
  deltaLabel,
  EARLIEST_SPACE_SCORE_QUARTER,
  SPACE_SCORE_TOP_25_METHODOLOGY,
  FASTEST_HIRING_METHODOLOGY,
} from '@/lib/rankings';
import { rankHiringGainers } from '@/lib/rankings-data';

describe('quarter arithmetic', () => {
  it('parses only well-formed YYYY-Qn', () => {
    expect(parseQuarterParam('2026-Q3')).toEqual({ year: 2026, quarter: 3, key: '2026-Q3' });
    expect(parseQuarterParam('2026-Q5')).toBeNull();
    expect(parseQuarterParam('2026-Q0')).toBeNull();
    expect(parseQuarterParam('2026-03')).toBeNull();
    expect(parseQuarterParam('1899-Q1')).toBeNull();
    expect(parseQuarterParam('')).toBeNull();
    expect(QUARTER_RE.test('2026-Q4')).toBe(true);
  });

  it('maps a UTC date to its quarter', () => {
    expect(quarterOf(new Date('2026-01-01T00:00:00Z')).key).toBe('2026-Q1');
    expect(quarterOf(new Date('2026-03-31T23:59:59Z')).key).toBe('2026-Q1');
    expect(quarterOf(new Date('2026-04-01T00:00:00Z')).key).toBe('2026-Q2');
    expect(quarterOf(new Date('2026-09-13T12:00:00Z')).key).toBe('2026-Q3');
    expect(quarterOf(new Date('2026-12-31T00:00:00Z')).key).toBe('2026-Q4');
  });

  it('walks backwards across the year boundary', () => {
    expect(previousQuarterKey('2026-Q3')).toBe('2026-Q2');
    expect(previousQuarterKey('2026-Q1')).toBe('2025-Q4');
    expect(previousQuarterKey('nonsense')).toBeNull();
  });

  it('labels a quarter with its month span', () => {
    expect(quarterShortLabel('2026-Q3')).toBe('Q3 2026');
    expect(quarterLabel('2026-Q1')).toContain('Q1 2026');
    expect(quarterLabel('2026-Q1')).toContain('Jan');
    expect(quarterLabel('2026-Q1')).toContain('Mar');
  });

  it('never serves an edition earlier than the first one', () => {
    expect(latestSpaceScoreQuarter(new Date('2020-01-01T00:00:00Z'))).toBe(EARLIEST_SPACE_SCORE_QUARTER);
    expect(latestSpaceScoreQuarter(new Date('2027-05-05T00:00:00Z'))).toBe('2027-Q2');
  });

  it('enumerates every edition from the first to the current one', () => {
    const keys = spaceScoreQuarterKeys(new Date('2027-02-01T00:00:00Z'));
    expect(keys[0]).toBe(EARLIEST_SPACE_SCORE_QUARTER);
    expect(keys[keys.length - 1]).toBe('2027-Q1');
    expect(keys).toEqual(['2026-Q3', '2026-Q4', '2027-Q1']);
    // Single-edition case (the state this shipped in).
    expect(spaceScoreQuarterKeys(new Date('2026-09-13T00:00:00Z'))).toEqual(['2026-Q3']);
  });

  it('builds quarter keys without drift', () => {
    expect(quarterKey(2026, 4)).toBe('2026-Q4');
  });
});

describe('month arithmetic', () => {
  it('walks backwards across the year boundary', () => {
    expect(previousMonthKey('2026-09')).toBe('2026-08');
    expect(previousMonthKey('2026-01')).toBe('2025-12');
    expect(previousMonthKey('2026-13')).toBeNull();
    expect(previousMonthKey('garbage')).toBeNull();
  });

  it('enumerates an inclusive month range oldest-first', () => {
    expect(monthKeysBetween('2026-08', '2026-11')).toEqual(['2026-08', '2026-09', '2026-10', '2026-11']);
    expect(monthKeysBetween('2026-08', '2026-08')).toEqual(['2026-08']);
  });
});

// ── Ordering and tie-breaks ──────────────────────────────────────────────

interface Row {
  slug: string | null;
  name: string;
  score: number;
  pct: number | null;
}

const rows: Row[] = [
  { slug: 'b-corp', name: 'B Corp', score: 900, pct: 10 },
  { slug: 'a-corp', name: 'A Corp', score: 900, pct: 10 },
  { slug: 'c-corp', name: 'C Corp', score: 950, pct: 5 },
  { slug: 'd-corp', name: 'D Corp', score: 900, pct: 40 },
];

describe('rankBy', () => {
  it('orders by value descending', () => {
    const ranked = rankBy(rows, (r) => r.score);
    expect(ranked[0].entry.name).toBe('C Corp');
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3, 4]);
  });

  it('breaks ties on the tie-break value, then alphabetically', () => {
    const ranked = rankBy(rows, (r) => r.score, { tieBreak: (r) => r.pct });
    expect(ranked.map((r) => r.entry.name)).toEqual(['C Corp', 'D Corp', 'A Corp', 'B Corp']);
  });

  it('is alphabetical when there is no tie-break at all', () => {
    const ranked = rankBy(rows, (r) => r.score);
    expect(ranked.slice(1).map((r) => r.entry.name)).toEqual(['A Corp', 'B Corp', 'D Corp']);
  });

  it('sorts nulls last in the tie-break', () => {
    const withNull: Row[] = [
      { slug: 'x', name: 'X', score: 10, pct: null },
      { slug: 'y', name: 'Y', score: 10, pct: 1 },
    ];
    expect(rankBy(withNull, (r) => r.score, { tieBreak: (r) => r.pct }).map((r) => r.entry.name)).toEqual([
      'Y',
      'X',
    ]);
  });

  it('applies the limit after sorting, not before', () => {
    const ranked = rankBy(rows, (r) => r.score, { limit: 2 });
    expect(ranked).toHaveLength(2);
    expect(ranked[0].entry.name).toBe('C Corp');
  });

  it('does not mutate its input', () => {
    const input = [...rows];
    rankBy(input, (r) => r.score);
    expect(input.map((r) => r.name)).toEqual(rows.map((r) => r.name));
  });

  it('identifies rows by slug, falling back to name', () => {
    expect(rowKey({ slug: 'Rocket-Lab', name: 'Rocket Lab' })).toBe('rocket-lab');
    expect(rowKey({ slug: null, name: 'Nameless Co' })).toBe('nameless co');
  });
});

// ── The honesty rule ─────────────────────────────────────────────────────

describe('applyRankDeltas — no previous edition', () => {
  const current = rankBy(rows, (r) => r.score, { tieBreak: (r) => r.pct });

  it('reports hasPrevious: false', () => {
    expect(applyRankDeltas(current, null).hasPrevious).toBe(false);
  });

  it('leaves every delta null — never zero, never an arrow', () => {
    const { rows: out } = applyRankDeltas(current, null);
    expect(out.map((r) => r.delta)).toEqual([null, null, null, null]);
    expect(out.map((r) => r.previousRank)).toEqual([null, null, null, null]);
  });

  it('flags nothing as a new entry (nothing can be new against nothing)', () => {
    const { rows: out } = applyRankDeltas(current, null);
    expect(out.some((r) => r.isNew)).toBe(false);
    expect(out.every((r) => deltaLabel(r) === 'No prior edition')).toBe(true);
  });
});

describe('applyRankDeltas — with a previous edition', () => {
  const current = rankBy(rows, (r) => r.score, { tieBreak: (r) => r.pct });
  // Previously: A Corp 1st, C Corp 2nd, B Corp 3rd; D Corp absent.
  const previous = [
    { rank: 1, key: 'a-corp' },
    { rank: 2, key: 'c-corp' },
    { rank: 3, key: 'b-corp' },
  ];

  it('reports hasPrevious: true', () => {
    expect(applyRankDeltas(current, previous).hasPrevious).toBe(true);
  });

  it('computes movement in positions, positive for a climb', () => {
    const byName = new Map(applyRankDeltas(current, previous).rows.map((r) => [r.entry.name, r]));
    expect(byName.get('C Corp')!.delta).toBe(1); // 2 -> 1
    expect(byName.get('A Corp')!.delta).toBe(-2); // 1 -> 3
    expect(byName.get('B Corp')!.delta).toBe(-1); // 3 -> 4
  });

  it('marks an absent company as a new entry with a null delta', () => {
    const d = applyRankDeltas(current, previous).rows.find((r) => r.entry.name === 'D Corp')!;
    expect(d.isNew).toBe(true);
    expect(d.delta).toBeNull();
    expect(deltaLabel(d)).toBe('New entry');
  });

  it('labels an unchanged position as unchanged, not as movement', () => {
    const same = applyRankDeltas(rankBy(rows, (r) => r.score, { tieBreak: (r) => r.pct }), [
      { rank: 1, key: 'c-corp' },
      { rank: 2, key: 'd-corp' },
      { rank: 3, key: 'a-corp' },
      { rank: 4, key: 'b-corp' },
    ]);
    expect(same.rows.every((r) => r.delta === 0)).toBe(true);
    expect(deltaLabel(same.rows[0])).toBe('Unchanged');
  });
});

// ── Hiring gainers ───────────────────────────────────────────────────────

describe('rankHiringGainers', () => {
  const mover = (companyName: string, change: number, percentChange: number | null) => ({
    companyName,
    slug: companyName.toLowerCase().replace(/\s+/g, '-'),
    first: 10,
    last: 10 + change,
    change,
    percentChange,
    firstDate: '2026-08-01',
    lastDate: '2026-08-31',
  });

  it('ranks by net roles added, descending', () => {
    const ranked = rankHiringGainers([mover('Small', 3, 30), mover('Big', 50, 5)]);
    expect(ranked.map((r) => r.entry.name)).toEqual(['Big', 'Small']);
  });

  it('breaks a net tie on percentage growth, then alphabetically', () => {
    const ranked = rankHiringGainers([
      mover('Zulu', 10, 5),
      mover('Alpha', 10, 5),
      mover('Mike', 10, 90),
    ]);
    expect(ranked.map((r) => r.entry.name)).toEqual(['Mike', 'Alpha', 'Zulu']);
  });

  it('returns an empty table rather than throwing when nothing qualified', () => {
    expect(rankHiringGainers([])).toEqual([]);
  });
});

// ── Methodology is not optional ──────────────────────────────────────────

describe('methodology copy', () => {
  it('ships with both rankings and is substantive', () => {
    for (const block of [SPACE_SCORE_TOP_25_METHODOLOGY, FASTEST_HIRING_METHODOLOGY]) {
      expect(block.length).toBeGreaterThanOrEqual(5);
      for (const line of block) expect(line.length).toBeGreaterThan(40);
    }
  });

  it('states how each table is ordered and how ties break', () => {
    const spaceScore = SPACE_SCORE_TOP_25_METHODOLOGY.join(' ').toLowerCase();
    expect(spaceScore).toContain('ties break');
    expect(spaceScore).toContain('not investment advice');

    const hiring = FASTEST_HIRING_METHODOLOGY.join(' ').toLowerCase();
    expect(hiring).toContain('ties break');
    expect(hiring).toContain('net roles added');
  });
});

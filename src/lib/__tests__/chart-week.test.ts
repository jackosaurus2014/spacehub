/**
 * @jest-environment node
 */

/**
 * Chart of the Week — the guards that make it a publication rather than a
 * dashboard widget.
 *
 *   1. THE WEEK KEY IS AN ISO WEEK-YEAR KEY. Using the calendar year would put
 *      late-December and early-January weeks on colliding keys, which in an
 *      archive means one edition silently overwriting another.
 *   2. THE CAPTION IS ARITHMETIC. Every clause must be traceable to a number in
 *      the series. This file pins what it will say and, just as importantly,
 *      what it will never say.
 *   3. A MISSED WEEK STAYS MISSING. missingChartWeeks names the gaps rather
 *      than closing them up as though the week never existed.
 */

import fs from 'fs';
import path from 'path';

import {
  CHART_WEEK_RE,
  EARLIEST_CHART_WEEK,
  PUBLICATION_WEEKDAY,
  captionFor,
  chartShape,
  chartWeekKey,
  chartWeekLabel,
  chartWeekRange,
  isChartWeekKey,
  isoWeekParts,
  missingChartWeeks,
  previousChartWeek,
} from '../chart-week-keys';
import { CHART_DEFS, getChartDef } from '../charts/registry';
import { registryRouteMissing } from '../registry-routes';

// ---------------------------------------------------------------------------
// 1. ISO week keys
// ---------------------------------------------------------------------------

describe('ISO week keys', () => {
  it('uses the ISO WEEK-YEAR, not the calendar year', () => {
    // 1 January 2027 is a Friday, so it belongs to ISO week 53 of 2026.
    expect(isoWeekParts(new Date('2027-01-01T00:00:00Z'))).toEqual({ year: 2026, week: 53 });
    expect(chartWeekKey(new Date('2027-01-01T00:00:00Z'))).toBe('2026-W53');
    // 4 January 2027 is the Monday that opens ISO week 1 of 2027.
    expect(chartWeekKey(new Date('2027-01-04T00:00:00Z'))).toBe('2027-W01');
  });

  it('gives every day of a week the same key', () => {
    const monday = new Date('2026-09-14T00:00:00Z');
    const keys = new Set<string>();
    for (let i = 0; i < 7; i++) {
      keys.add(chartWeekKey(new Date(monday.getTime() + i * 86_400_000)));
    }
    expect(keys.size).toBe(1);
  });

  it('rejects malformed keys', () => {
    expect(isChartWeekKey('2026-W38')).toBe(true);
    expect(isChartWeekKey('2026-W00')).toBe(false);
    expect(isChartWeekKey('2026-W54')).toBe(false);
    expect(isChartWeekKey('2026-38')).toBe(false);
    expect(isChartWeekKey('2026-W3')).toBe(false);
    expect(isChartWeekKey('../secrets')).toBe(false);
    expect(CHART_WEEK_RE.test('2026-W38')).toBe(true);
  });

  it('maps a key back to the Monday and Sunday it covers', () => {
    const range = chartWeekRange('2026-W38')!;
    expect(range.start.toISOString().slice(0, 10)).toBe('2026-09-14');
    expect(range.end.toISOString().slice(0, 10)).toBe('2026-09-20');
    expect(range.start.getUTCDay()).toBe(1); // Monday
    expect(range.end.getUTCDay()).toBe(0); // Sunday
  });

  it('round-trips every week of a year without collision or drift', () => {
    const seen = new Set<string>();
    let cursor = new Date('2026-01-05T00:00:00Z');
    for (let i = 0; i < 52; i++) {
      const key = chartWeekKey(cursor);
      expect(seen.has(key)).toBe(false);
      seen.add(key);
      const range = chartWeekRange(key)!;
      expect(chartWeekKey(range.start)).toBe(key);
      expect(chartWeekKey(range.end)).toBe(key);
      cursor = new Date(cursor.getTime() + 7 * 86_400_000);
    }
  });

  it('refuses a week 53 that does not exist in that year', () => {
    // 2027 has 52 ISO weeks, so 2027-W53 must not resolve to a 2028 week.
    expect(chartWeekRange('2027-W53')).toBeNull();
  });

  it('steps back a week across a year boundary', () => {
    expect(previousChartWeek('2027-W01')).toBe('2026-W53');
    expect(previousChartWeek('2026-W38')).toBe('2026-W37');
  });

  it('labels a week with both ends of it, so a reader never has to guess', () => {
    expect(chartWeekLabel('2026-W38')).toBe('Sep 14, 2026 – Sep 20, 2026');
  });

  it('publishes on a fixed weekday, and the cron schedule agrees', () => {
    expect(PUBLICATION_WEEKDAY).toBe(3); // Wednesday
    const scheduler = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/cron-scheduler.ts'),
      'utf-8'
    );
    const line = scheduler
      .split('\n')
      .find((l) => l.includes("path: '/api/cron/chart-of-the-week'"));
    expect(line).toBeDefined();
    // '<minute> <hour> * * 3' — the weekday field must match.
    expect(line!).toMatch(/schedule: '\d+ \d+ \* \* 3'/);
  });
});

// ---------------------------------------------------------------------------
// 2. The caption is arithmetic, not prose
// ---------------------------------------------------------------------------

describe('the computed caption', () => {
  const timeDef = getChartDef('launches-per-month')!;
  const categoryDef = getChartDef('launches-by-agency-90d')!;

  it('classifies charts so each shape gets the right factual sentence', () => {
    expect(chartShape('launches-by-agency-90d')).toBe('category');
    expect(chartShape('launches-per-month')).toBe('time');
    // A chart added without thinking about this still gets an honest caption.
    expect(chartShape('a-chart-nobody-classified')).toBe('time');
  });

  it('states the total, the latest point and the move for a time series', () => {
    const caption = captionFor(timeDef, {
      labels: ['Jul', 'Aug', 'Sep'],
      values: [10, 12, 9],
    });
    expect(caption).toContain('3 points totalling 31');
    expect(caption).toContain('latest Sep at 9');
    expect(caption).toContain('down 3 on Aug');
    expect(caption).toContain('highest Aug at 12');
  });

  it('says "unchanged" rather than inventing a direction', () => {
    const caption = captionFor(timeDef, { labels: ['Jul', 'Aug'], values: [7, 7] });
    expect(caption).toContain('unchanged from Jul');
    expect(caption).not.toMatch(/\bup\b|\bdown\b/);
  });

  it('states the leader and its share for a category chart', () => {
    const caption = captionFor(categoryDef, {
      labels: ['SpaceX', 'CASC', 'Rocket Lab'],
      values: [50, 30, 20],
    });
    expect(caption).toContain('3 shown, totalling 100');
    expect(caption).toContain('SpaceX highest at 50, 50.0% of the total');
    expect(caption).toContain('Rocket Lab lowest at 20');
  });

  it('carries the series footnote through instead of dropping the caveat', () => {
    const caption = captionFor(timeDef, {
      labels: ['Jul', 'Aug'],
      values: [1, 2],
      note: 'current month is partial',
    });
    expect(caption).toContain('Current month is partial.');
  });

  it('survives an empty or single-point series without dividing by zero', () => {
    expect(captionFor(timeDef, { labels: [], values: [] })).toContain('no data points');
    const one = captionFor(timeDef, { labels: ['Sep'], values: [4] });
    expect(one).toContain('1 points totalling 4');
    expect(one).not.toContain('NaN');
    expect(one).not.toContain('Infinity');
    const zeroTotal = captionFor(categoryDef, { labels: ['A', 'B'], values: [0, 0] });
    expect(zeroTotal).not.toContain('NaN');
    expect(zeroTotal).not.toContain('%');
  });

  it('never editorialises — no adjectives, no causes, no predictions', () => {
    const forbidden =
      /\b(surge|surged|soar|soared|plunge|plunged|record-breaking|impressive|disappointing|strong|weak|expect|expected|forecast|suggests|likely|because|driven by|thanks to)\b/i;
    for (const def of CHART_DEFS) {
      const caption = captionFor(def, {
        labels: ['A', 'B', 'C'],
        values: [1, 9, 4],
        note: 'week beginning',
      });
      expect(caption).not.toMatch(forbidden);
    }
  });

  it('draws every clause from a number in the series', () => {
    const caption = captionFor(timeDef, { labels: ['Jan', 'Feb'], values: [3, 8] });
    // Strip the chart's own subtitle, which is fixed copy from the registry;
    // everything the caption ADDS must be a number out of the series.
    const computed = caption.slice(timeDef.subtitle.length);
    const numbers = computed.match(/\d+(\.\d+)?/g) ?? [];
    expect(numbers.length).toBeGreaterThan(0);
    for (const n of numbers) {
      // 2 points, total 11, latest 8, moved up 5, highest 8.
      expect(['2', '11', '8', '3', '5']).toContain(n);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. A missed week stays missing
// ---------------------------------------------------------------------------

describe('gaps in the archive', () => {
  const NOW = new Date('2026-10-07T00:00:00Z'); // ISO 2026-W41

  it('names every week with no edition, most recent first', () => {
    const gaps = missingChartWeeks(['2026-W38', '2026-W40'], NOW, '2026-W38');
    expect(gaps).toEqual(['2026-W41', '2026-W39']);
  });

  it('is empty when every week since the first edition was published', () => {
    const gaps = missingChartWeeks(
      ['2026-W38', '2026-W39', '2026-W40', '2026-W41'],
      NOW,
      '2026-W38'
    );
    expect(gaps).toEqual([]);
  });

  it('never looks further back than the first edition', () => {
    const gaps = missingChartWeeks([], NOW, '2026-W40');
    expect(gaps).toEqual(['2026-W41', '2026-W40']);
  });

  it('starts the archive at a real, resolvable week', () => {
    expect(isChartWeekKey(EARLIEST_CHART_WEEK)).toBe(true);
    expect(chartWeekRange(EARLIEST_CHART_WEEK)).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4. Routing
// ---------------------------------------------------------------------------

describe('the weekly archive routes', () => {
  it('does not mistake /chart/week for an unknown chart slug', () => {
    expect(registryRouteMissing('/chart/week')).toBe(false);
    expect(registryRouteMissing('/chart/not-a-chart')).toBe(true);
  });

  it('404s a malformed or pre-history week key', () => {
    expect(registryRouteMissing('/chart/week/2026-W38')).toBe(false);
    expect(registryRouteMissing('/chart/week/2026-W54')).toBe(true);
    expect(registryRouteMissing('/chart/week/not-a-week')).toBe(true);
    expect(registryRouteMissing('/chart/week/2020-W01')).toBe(true);
  });

  it('leaves the live chart permalinks alone', () => {
    for (const def of CHART_DEFS) {
      expect(registryRouteMissing(`/chart/${def.slug}`)).toBe(false);
    }
  });
});

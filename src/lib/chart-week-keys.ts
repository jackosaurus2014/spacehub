/**
 * Chart of the Week — the pure week arithmetic and the computed caption.
 *
 * Split out of chart-week.ts because src/lib/registry-routes.ts consults it
 * from the EDGE runtime (to give an unknown week key a real 404) and that file
 * may not pull in Prisma. Everything here is pure: ISO week keys, the range
 * they cover, and a caption that is arithmetic over a series. chart-week.ts
 * re-exports all of it, so existing callers need not care about the split.
 */

import { getChartDef, type ChartDef } from '@/lib/charts/registry';
import { formatValue, type ChartSeries } from '@/lib/charts/render';

export const CHART_WEEK_RE = /^(\d{4})-W(\d{2})$/;

/**
 * Publication day: WEDNESDAY, in the middle of the working week and clear of
 * the Monday/Thursday digest. The cron that enforces it lives in
 * src/lib/cron-scheduler.ts and its label is chart-of-the-week.
 */
export const PUBLICATION_WEEKDAY = 3; // ISO: Monday = 1
export const PUBLICATION_WEEKDAY_LABEL = 'Wednesday';
export const PUBLICATION_TIME_UTC = '15:30 UTC';

/** The first week we publish an edition for. Nothing earlier is rendered. */
export const EARLIEST_CHART_WEEK = '2026-W38';

// ---------------------------------------------------------------------------
// ISO week arithmetic
// ---------------------------------------------------------------------------

/**
 * ISO-8601 week-year AND week number.
 *
 * The week-year is not the calendar year: 2026-01-01 can belong to week 53 of
 * 2025. src/lib/charts/registry.ts only needs the week NUMBER for its
 * rotation, so it computes that alone; an archive key needs both or two
 * different years collide on the same key.
 */
export function isoWeekParts(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day); // Thursday of this ISO week
  const year = d.getUTCFullYear();
  const yearStart = Date.UTC(year, 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return { year, week };
}

/** 'YYYY-Www' for the ISO week a date falls in. */
export function chartWeekKey(date: Date = new Date()): string {
  const { year, week } = isoWeekParts(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function isChartWeekKey(key: string): boolean {
  const m = CHART_WEEK_RE.exec(key);
  if (!m) return false;
  const year = Number(m[1]);
  const week = Number(m[2]);
  return year >= 2000 && year <= 2100 && week >= 1 && week <= 53;
}

/** Monday 00:00 UTC of an ISO week key, and the Sunday that closes it. */
export function chartWeekRange(key: string): { start: Date; end: Date } | null {
  const m = CHART_WEEK_RE.exec(key);
  if (!m || !isChartWeekKey(key)) return null;
  const year = Number(m[1]);
  const week = Number(m[2]);
  // ISO week 1 is the week containing 4 January.
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4.getTime() - (jan4Day - 1) * 86_400_000);
  const start = new Date(week1Monday.getTime() + (week - 1) * 7 * 86_400_000);
  // A week 53 that does not exist in this year rolls into the next one; reject
  // it rather than silently publishing a key that maps to a different week.
  if (chartWeekKey(start) !== key) return null;
  return { start, end: new Date(start.getTime() + 6 * 86_400_000) };
}

const DATE_FMT: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
};

/** 'Week of 14 September 2026' style label, with both ends of the week. */
export function chartWeekLabel(key: string): string {
  const range = chartWeekRange(key);
  if (!range) return key;
  const start = range.start.toLocaleDateString('en-US', DATE_FMT);
  const end = range.end.toLocaleDateString('en-US', DATE_FMT);
  return `${start} – ${end}`;
}

export function previousChartWeek(key: string): string | null {
  const range = chartWeekRange(key);
  if (!range) return null;
  return chartWeekKey(new Date(range.start.getTime() - 7 * 86_400_000));
}

// ---------------------------------------------------------------------------
// The caption — arithmetic, not prose
// ---------------------------------------------------------------------------

/**
 * Charts fall into two shapes and they want different factual sentences.
 * Kept here rather than in the chart registry so the registry stays a pure
 * display contract, and defaulting to 'time' means a new chart added without
 * thinking about this still gets an honest caption.
 */
const CATEGORY_CHARTS = new Set(['launches-by-agency-90d']);

export type ChartShape = 'time' | 'category';

export function chartShape(slug: string): ChartShape {
  return CATEGORY_CHARTS.has(slug) ? 'category' : 'time';
}

/**
 * One factual sentence about the series. Every clause is a number taken
 * straight out of `values`; nothing here interprets, predicts or characterises.
 *
 * Exported and pure so the test can pin exactly what it will and will not say.
 */
export function captionFor(def: ChartDef, series: ChartSeries): string {
  const { labels, values } = series;
  if (values.length === 0) return `${def.title}: no data points.`;

  const total = values.reduce((a, b) => a + b, 0);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const maxLabel = labels[values.indexOf(maxValue)] ?? '';
  const minLabel = labels[values.indexOf(minValue)] ?? '';
  const fmt = (v: number) => formatValue(v, def.unit);

  const parts: string[] = [];

  if (chartShape(def.slug) === 'category') {
    const leadLabel = maxLabel;
    const share = total > 0 ? ((maxValue / total) * 100).toFixed(1) : null;
    parts.push(`${values.length} shown, totalling ${fmt(total)}`);
    parts.push(
      share === null
        ? `${leadLabel} highest at ${fmt(maxValue)}`
        : `${leadLabel} highest at ${fmt(maxValue)}, ${share}% of the total`
    );
    if (values.length > 1) parts.push(`${minLabel} lowest at ${fmt(minValue)}`);
  } else {
    const latestValue = values[values.length - 1];
    const latestLabel = labels[labels.length - 1] ?? '';
    parts.push(`${values.length} points totalling ${fmt(total)}`);
    parts.push(`latest ${latestLabel} at ${fmt(latestValue)}`);
    if (values.length > 1) {
      const prior = values[values.length - 2];
      const delta = latestValue - prior;
      parts.push(
        delta === 0
          ? `unchanged from ${labels[labels.length - 2] ?? 'the point before'}`
          : `${delta > 0 ? 'up' : 'down'} ${fmt(Math.abs(delta))} on ${labels[labels.length - 2] ?? 'the point before'}`
      );
      parts.push(`highest ${maxLabel} at ${fmt(maxValue)}`);
    }
  }

  const note = series.note ? ` ${series.note[0].toUpperCase()}${series.note.slice(1)}.` : '';
  return `${def.subtitle}: ${parts.join('; ')}.${note}`;
}


/**
 * Weeks since EARLIEST_CHART_WEEK that have no edition, most recent first.
 * A gap is a missed publication and the archive prints it rather than closing
 * it up as though the week never existed.
 */
export function missingChartWeeks(
  published: string[],
  now: Date = new Date(),
  earliest: string = EARLIEST_CHART_WEEK
): string[] {
  const have = new Set(published);
  const out: string[] = [];
  let cursor = chartWeekKey(now);
  for (let i = 0; i < 260 && cursor >= earliest; i++) {
    if (!have.has(cursor)) out.push(cursor);
    const prev = previousChartWeek(cursor);
    if (!prev) break;
    cursor = prev;
  }
  return out;
}

/** The registry definition behind a pinned edition, when it still exists. */
export function chartDefForSlug(slug: string): ChartDef | undefined {
  return getChartDef(slug);
}

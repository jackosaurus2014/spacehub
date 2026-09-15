/**
 * Chart of the Week — the dated, pinned edition.
 *
 * WHAT WAS MISSING. src/lib/charts/* already draws five charts and rotates a
 * pick by ISO week, but every one of them renders LIVE data: open
 * /chart/launches-per-month a month later and the numbers have moved. That is
 * right for a dashboard and wrong for a weekly publication. A habit needs the
 * same day every week, an archive, and a permanent URL whose contents do not
 * change under the reader.
 *
 * WHAT THIS ADDS. Once a week the cron picks the rotation's chart, computes
 * the series once, writes a COMPUTED caption, and freezes all of it in
 * ChartWeeklyEdition. /chart/week lists the archive; /chart/week/<key> renders
 * exactly what was published that week, forever.
 *
 * THE CAPTION IS COMPUTED, NOT WRITTEN. captionFor() below is arithmetic over
 * the series — totals, the latest point, the highest and lowest, the leader's
 * share. It states what the chart shows and stops. No model is called, and
 * there is no place in this pipeline where one could be.
 */

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { pickChartOfTheWeek } from '@/lib/charts/data';
import { getChartDef, type ChartDef } from '@/lib/charts/registry';
import {
  captionFor,
  chartWeekKey,
  chartWeekLabel,
  chartWeekRange,
  isChartWeekKey,
} from '@/lib/chart-week-keys';

// The pure week arithmetic and the computed caption live in chart-week-keys.ts
// so the edge-runtime 404 registry can import them without pulling in Prisma.
// Re-exported here because this is the module everything else imports.
export {
  captionFor,
  chartShape,
  chartWeekKey,
  chartWeekLabel,
  chartWeekRange,
  isChartWeekKey,
  isoWeekParts,
  missingChartWeeks,
  previousChartWeek,
  CHART_WEEK_RE,
  EARLIEST_CHART_WEEK,
  PUBLICATION_TIME_UTC,
  PUBLICATION_WEEKDAY,
  PUBLICATION_WEEKDAY_LABEL,
  type ChartShape,
} from '@/lib/chart-week-keys';

// ---------------------------------------------------------------------------
// Reading editions
// ---------------------------------------------------------------------------

export interface ChartWeekEdition {
  weekKey: string;
  weekLabel: string;
  weekStart: string; // YYYY-MM-DD
  weekEnd: string; // YYYY-MM-DD
  slug: string;
  title: string;
  subtitle: string;
  source: string;
  unit: ChartDef['unit'];
  labels: string[];
  values: number[];
  note: string | null;
  caption: string;
  pointCount: number;
  publishedAt: string; // ISO
}

function toEdition(row: {
  weekKey: string;
  weekStart: Date;
  weekEnd: Date;
  slug: string;
  title: string;
  subtitle: string;
  source: string;
  unit: string;
  labels: unknown;
  values: unknown;
  note: string | null;
  caption: string;
  pointCount: number;
  publishedAt: Date;
}): ChartWeekEdition {
  return {
    weekKey: row.weekKey,
    weekLabel: chartWeekLabel(row.weekKey),
    weekStart: row.weekStart.toISOString().slice(0, 10),
    weekEnd: row.weekEnd.toISOString().slice(0, 10),
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    source: row.source,
    unit: (row.unit as ChartDef['unit']) ?? 'count',
    labels: Array.isArray(row.labels) ? (row.labels as string[]) : [],
    values: Array.isArray(row.values) ? (row.values as number[]) : [],
    note: row.note,
    caption: row.caption,
    pointCount: row.pointCount,
    publishedAt: row.publishedAt.toISOString(),
  };
}

const SELECT = {
  weekKey: true,
  weekStart: true,
  weekEnd: true,
  slug: true,
  title: true,
  subtitle: true,
  source: true,
  unit: true,
  labels: true,
  values: true,
  note: true,
  caption: true,
  pointCount: true,
  publishedAt: true,
} as const;

export async function getChartWeekEdition(weekKey: string): Promise<ChartWeekEdition | null> {
  if (!isChartWeekKey(weekKey)) return null;
  try {
    const row = await prisma.chartWeeklyEdition.findUnique({
      where: { weekKey },
      select: SELECT,
    });
    return row ? toEdition(row) : null;
  } catch (error) {
    logger.error('Chart week read failed', {
      weekKey,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function listChartWeekEditions(take = 52): Promise<ChartWeekEdition[]> {
  try {
    const rows = await prisma.chartWeeklyEdition.findMany({
      orderBy: { weekStart: 'desc' },
      take,
      select: SELECT,
    });
    return rows.map(toEdition);
  } catch (error) {
    logger.error('Chart week list failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

export async function latestChartWeekEdition(): Promise<ChartWeekEdition | null> {
  const [latest] = await listChartWeekEditions(1);
  return latest ?? null;
}

// ---------------------------------------------------------------------------
// Publishing
// ---------------------------------------------------------------------------

export interface PublishResult {
  weekKey: string;
  published: boolean;
  /** Already on the shelf — a re-run never redraws a pinned week. */
  alreadyPublished: boolean;
  slug: string | null;
  reason?: string;
}

/**
 * Publish this week's edition.
 *
 * IDEMPOTENT AND IMMUTABLE. A week that already has an edition is left exactly
 * as it is: the whole value of a permalink is that its contents do not change,
 * so a catch-up run after a missed Wednesday must not redraw last week with
 * this week's data.
 *
 * Returns published:false with a reason when every chart in the rotation came
 * back empty, which is the honest outcome and the one the cron alerts on.
 */
export async function publishChartOfTheWeek(now: Date = new Date()): Promise<PublishResult> {
  const weekKey = chartWeekKey(now);
  const range = chartWeekRange(weekKey);
  if (!range) {
    return { weekKey, published: false, alreadyPublished: false, slug: null, reason: 'Unresolvable ISO week key.' };
  }

  const existing = await getChartWeekEdition(weekKey);
  if (existing) {
    return { weekKey, published: false, alreadyPublished: true, slug: existing.slug };
  }

  const picked = await pickChartOfTheWeek(now);
  if (!picked) {
    return {
      weekKey,
      published: false,
      alreadyPublished: false,
      slug: null,
      reason: 'Every chart in the rotation returned no data.',
    };
  }

  const { def, series } = picked;
  const caption = captionFor(def, series);

  try {
    await prisma.chartWeeklyEdition.create({
      data: {
        weekKey,
        weekStart: range.start,
        weekEnd: range.end,
        slug: def.slug,
        title: def.title,
        subtitle: def.subtitle,
        source: def.source,
        unit: def.unit,
        labels: series.labels,
        values: series.values,
        note: series.note ?? null,
        caption,
        pointCount: series.values.length,
        publishedAt: new Date(),
      },
    });
  } catch (error) {
    // A unique-constraint collision means a concurrent run won the race, which
    // is a success from the reader's point of view.
    const again = await getChartWeekEdition(weekKey);
    if (again) {
      return { weekKey, published: false, alreadyPublished: true, slug: again.slug };
    }
    logger.error('Chart week publish failed', {
      weekKey,
      slug: def.slug,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      weekKey,
      published: false,
      alreadyPublished: false,
      slug: def.slug,
      reason: error instanceof Error ? error.message : String(error),
    };
  }

  return { weekKey, published: true, alreadyPublished: false, slug: def.slug };
}

/** The registry definition behind a pinned edition, when it still exists. */
export function editionChartDef(edition: ChartWeekEdition): ChartDef | undefined {
  return getChartDef(edition.slug);
}

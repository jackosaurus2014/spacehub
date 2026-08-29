// Chart of the Week — data loaders (Prisma). Each returns null when there is
// nothing worth drawing so the digest picker can move to the next chart
// instead of mailing an empty axis.

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { CHART_DEFS, chartOfTheWeekSlug, getChartDef, type ChartDef } from './registry';
import type { ChartSeries } from './render';

const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthKeys(now: Date, count: number): { key: string; label: string; start: Date }[] {
  const out: { key: string; label: string; start: Date }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const label = i === count - 1 || d.getUTCMonth() === 0 ? `${MONTH[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}` : MONTH[d.getUTCMonth()];
    out.push({ key, label, start: d });
  }
  return out;
}

function keyOf(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

async function launchesPerMonth(now: Date): Promise<ChartSeries | null> {
  const months = monthKeys(now, 12);
  const rows = await prisma.spaceEvent.findMany({
    where: { type: 'launch', status: { in: ['completed', 'failed'] }, launchDate: { gte: months[0].start, lte: now } },
    select: { launchDate: true },
  });
  if (rows.length === 0) return null;
  const counts = new Map(months.map((m) => [m.key, 0]));
  for (const r of rows) {
    if (!r.launchDate) continue;
    const k = keyOf(r.launchDate);
    if (counts.has(k)) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return { labels: months.map((m) => m.label), values: months.map((m) => counts.get(m.key) ?? 0), note: 'current month is partial' };
}

async function launchesByAgency90d(now: Date): Promise<ChartSeries | null> {
  const since = new Date(now.getTime() - 90 * 86400000);
  const rows = await prisma.spaceEvent.groupBy({
    by: ['agency'],
    where: { type: 'launch', status: { in: ['completed', 'failed'] }, launchDate: { gte: since, lte: now }, agency: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { agency: 'desc' } },
    take: 8,
  });
  if (rows.length === 0) return null;
  return { labels: rows.map((r) => r.agency ?? 'Unknown'), values: rows.map((r) => r._count._all) };
}

async function fundingByMonth(now: Date): Promise<ChartSeries | null> {
  const months = monthKeys(now, 12);
  const rows = await prisma.fundingRound.findMany({
    where: { date: { gte: months[0].start, lte: now }, amount: { gt: 0 } },
    select: { date: true, amount: true },
  });
  if (rows.length === 0) return null;
  const sums = new Map(months.map((m) => [m.key, 0]));
  for (const r of rows) {
    const k = keyOf(r.date);
    if (sums.has(k)) sums.set(k, (sums.get(k) ?? 0) + (r.amount ?? 0));
  }
  return { labels: months.map((m) => m.label), values: months.map((m) => sums.get(m.key) ?? 0) };
}

async function openSpaceJobs(now: Date): Promise<ChartSeries | null> {
  // One point per week: the sum of every company's active postings on the
  // latest snapshot date that week. Needs a few weeks of history to be worth
  // drawing; the picker skips it until then.
  const since = new Date(now.getTime() - 12 * 7 * 86400000);
  const rows = await prisma.companyJobSnapshot.groupBy({
    by: ['date'],
    where: { date: { gte: since } },
    _sum: { activeJobs: true },
    orderBy: { date: 'asc' },
  });
  if (rows.length < 3) return null;
  const byWeek = new Map<string, { label: string; total: number }>();
  for (const r of rows) {
    const d = new Date(r.date);
    const weekStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7)));
    const k = weekStart.toISOString().slice(0, 10);
    byWeek.set(k, { label: `${MONTH[weekStart.getUTCMonth()]} ${weekStart.getUTCDate()}`, total: r._sum.activeJobs ?? 0 });
  }
  const weeks = Array.from(byWeek.values());
  if (weeks.length < 3) return null;
  return { labels: weeks.map((w) => w.label), values: weeks.map((w) => w.total), note: 'latest snapshot each week' };
}

async function launchSlipsByWeek(now: Date): Promise<ChartSeries | null> {
  const weeks = 8;
  const since = new Date(now.getTime() - weeks * 7 * 86400000);
  const rows = await prisma.launchDateChange.findMany({ where: { observedAt: { gte: since } }, select: { observedAt: true } });
  if (rows.length < 5) return null;
  const buckets: { label: string; start: number; count: number }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(now.getTime() - (i + 1) * 7 * 86400000);
    buckets.push({ label: `${MONTH[start.getUTCMonth()]} ${start.getUTCDate()}`, start: start.getTime(), count: 0 });
  }
  for (const r of rows) {
    const t = r.observedAt.getTime();
    for (let i = buckets.length - 1; i >= 0; i--) {
      if (t >= buckets[i].start) { buckets[i].count++; break; }
    }
  }
  return { labels: buckets.map((b) => b.label), values: buckets.map((b) => b.count), note: 'week beginning' };
}

const LOADERS: Record<string, (now: Date) => Promise<ChartSeries | null>> = {
  'launches-per-month': launchesPerMonth,
  'launches-by-agency-90d': launchesByAgency90d,
  'funding-by-month': fundingByMonth,
  'open-space-jobs': openSpaceJobs,
  'launch-slips-by-week': launchSlipsByWeek,
};

export async function loadChartSeries(slug: string, now: Date = new Date()): Promise<ChartSeries | null> {
  const loader = LOADERS[slug];
  if (!loader) return null;
  try {
    return await loader(now);
  } catch (error) {
    logger.error('Chart data load failed', { slug, error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/** The week's chart with data, or null when every chart came back empty. */
export async function pickChartOfTheWeek(now: Date = new Date()): Promise<{ def: ChartDef; series: ChartSeries } | null> {
  for (let offset = 0; offset < CHART_DEFS.length; offset++) {
    const slug = chartOfTheWeekSlug(now, offset);
    const def = getChartDef(slug);
    if (!def) continue;
    const series = await loadChartSeries(slug, now);
    if (series) return { def, series };
  }
  return null;
}

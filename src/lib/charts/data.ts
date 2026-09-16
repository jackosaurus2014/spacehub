// Chart of the Week — data loaders (Prisma). Each returns null when there is
// nothing worth drawing so the digest picker can move to the next chart
// instead of mailing an empty axis.

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { qualifiesAsSpaceVenture } from '@/lib/funding/space-classification';
import { TOTAL_SENTINEL } from '@/lib/hiring-snapshots';
import { CHART_DEFS, chartOfTheWeekSlug, getChartDef, type ChartDef } from './registry';
import type { ChartSeries } from './render';

// Provider names as Launch Library spells them, shortened for a bar label.
const AGENCY_SHORT: Record<string, string> = {
  'China Aerospace Science and Technology Corporation': 'CASC',
  'China Aerospace Science and Industry Corporation': 'CASIC',
  'Mitsubishi Heavy Industries': 'MHI',
  'Russian Federal Space Agency (ROSCOSMOS)': 'Roscosmos',
  'Russian Space Forces': 'Russian Space Forces',
  'Indian Space Research Organization': 'ISRO',
  'United Launch Alliance': 'ULA',
  'China Rocket Co. Ltd.': 'China Rocket',
  'Galactic Energy': 'Galactic Energy',
  'Landspace Technology Corporation': 'LandSpace',
  'Beijing Tianbing Technology Co., Ltd.': 'Space Pioneer',
  'Japan Aerospace Exploration Agency': 'JAXA',
  'National Aeronautics and Space Administration': 'NASA',
};
export function shortAgency(name: string): string {
  const s = AGENCY_SHORT[name] ?? name;
  return s.length > 16 ? s.slice(0, 15) + '…' : s;
}

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

// Launch Library ids are UUIDs; curated seed events carry ids like
// 'event-1394' or 'artemis-ii-…' and are not launches to count.
const LL2_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isLaunchLibraryId(id: string | null | undefined): boolean {
  return !!id && LL2_ID.test(id);
}

function keyOf(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

async function launchesPerMonth(now: Date): Promise<ChartSeries | null> {
  const months = monthKeys(now, 12);
  const rows = await prisma.spaceEvent.findMany({
    // Every Launch Library row is a launch, whatever mission type it was filed
    // under — filtering on type='launch' dropped half of them. Curated seed
    // events (non-UUID ids) are excluded in code; Prisma has no regex filter.
    where: { externalId: { not: null }, status: { in: ['completed', 'failed'] }, launchDate: { gte: months[0].start, lte: now } },
    select: { launchDate: true, externalId: true },
  }).then((r) => r.filter((x) => isLaunchLibraryId(x.externalId)));
  if (rows.length === 0) return null;
  const counts = new Map(months.map((m) => [m.key, 0]));
  for (const r of rows) {
    if (!r.launchDate) continue;
    const k = keyOf(r.launchDate);
    if (counts.has(k)) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return { labels: months.map((m) => m.label), values: months.map((m) => counts.get(m.key) ?? 0), note: 'current month is partial', recordCount: rows.length };
}

async function launchesByAgency90d(now: Date): Promise<ChartSeries | null> {
  const since = new Date(now.getTime() - 90 * 86400000);
  const rows = (await prisma.spaceEvent.findMany({
    where: { externalId: { not: null }, status: { in: ['completed', 'failed'] }, launchDate: { gte: since, lte: now }, agency: { not: null } },
    select: { agency: true, externalId: true },
  })).filter((r) => isLaunchLibraryId(r.externalId));
  if (rows.length === 0) return null;
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.agency ?? 'Unknown', (counts.get(r.agency ?? 'Unknown') ?? 0) + 1);
  const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  return { labels: top.map(([a]) => shortAgency(a)), values: top.map(([, v]) => v), recordCount: rows.length };
}

/**
 * Private space funding by month.
 *
 * Counts only rounds that pass the published space-venture rule in
 * src/lib/funding/space-classification.ts — the same rule the Most Active
 * Space Investors release states on its own page. Without it a single $75.0B
 * SpaceX IPO drew a bar eighteen times the height of every real month beside
 * it, under a title that says "funding". An IPO is not a funding round, and a
 * defence-autonomy round is not space money.
 */
async function fundingByMonth(now: Date): Promise<ChartSeries | null> {
  const months = monthKeys(now, 12);
  const rows = await prisma.fundingRound.findMany({
    where: { date: { gte: months[0].start, lte: now }, amount: { gt: 0 } },
    select: {
      date: true,
      amount: true,
      seriesLabel: true,
      roundType: true,
      company: { select: { sector: true, subsector: true, isPublic: true } },
    },
  });
  const counted = rows.filter((r) => qualifiesAsSpaceVenture(r));
  if (counted.length === 0) return null;
  const sums = new Map(months.map((m) => [m.key, 0]));
  for (const r of counted) {
    const k = keyOf(r.date);
    if (sums.has(k)) sums.set(k, (sums.get(k) ?? 0) + (r.amount ?? 0));
  }
  return {
    labels: months.map((m) => m.label),
    values: months.map((m) => sums.get(m.key) ?? 0),
    note: 'disclosed private space rounds only — IPOs, secondaries, debt and grants excluded',
    recordCount: counted.length,
  };
}

/**
 * Open space-industry jobs, one point per week.
 *
 * THIS CHART USED TO BE ROUGHLY THREE TIMES THE TRUTH. It grouped
 * CompanyJobSnapshot by date and summed `activeJobs` across EVERY row on that
 * date. But the capture writes three kinds of row for each date: one per
 * company, plus the two site-wide sentinels `_TOTAL` (every active posting)
 * and `_PRIVATE_TOTAL` (the private-company subset). Summing all of them adds
 * the site-wide total to a per-company breakdown of the same postings and then
 * adds most of them a third time, so the chart read 22.6k on a day when the
 * site had 6.7k open roles — while /hiring-index quoted the `_TOTAL` row and
 * read 6,733. Two public pages, one metric, a 3.4x gap.
 *
 * The fix is to read the same row /hiring-index reads: the `_TOTAL` sentinel,
 * which IS the site-wide count by definition, so the two pages can no longer
 * disagree.
 *
 * The labels were wrong too. Each point is the LAST snapshot of its week, but
 * the label was the week's Monday — so a value captured on 6 September was
 * published as "Aug 31". Points are now labelled with the date they were
 * actually measured on.
 */
async function openSpaceJobs(now: Date): Promise<ChartSeries | null> {
  const since = new Date(now.getTime() - 12 * 7 * 86400000);
  const rows = await prisma.companyJobSnapshot.findMany({
    where: { date: { gte: since }, companyName: TOTAL_SENTINEL },
    orderBy: { date: 'asc' },
    select: { date: true, activeJobs: true },
  });
  if (rows.length < 3) return null;
  // Latest snapshot in each ISO week wins; the label is that snapshot's date.
  const byWeek = new Map<string, { label: string; total: number }>();
  for (const r of rows) {
    const d = new Date(r.date);
    const weekStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7)));
    const k = weekStart.toISOString().slice(0, 10);
    byWeek.set(k, { label: `${MONTH[d.getUTCMonth()]} ${d.getUTCDate()}`, total: r.activeJobs });
  }
  const weeks = Array.from(byWeek.values());
  if (weeks.length < 3) return null;
  return {
    labels: weeks.map((w) => w.label),
    values: weeks.map((w) => w.total),
    note: 'site-wide active postings on the last snapshot of each week',
    recordCount: rows.length,
  };
}

/**
 * Launch-date slips per week.
 *
 * The window STARTS at the first slip we ever observed, not eight weeks
 * before today. The ledger began on 2026-08-29, so a fixed eight-week window
 * rendered five bars of zero for weeks when nobody was recording — and the
 * homepage drew them beside a "VERIFIED" badge under the claim that nobody
 * else records this. A zero that means "we were not looking" is not a
 * measurement, and presenting it as one is the same failure as an empty tab
 * standing in for a dead feed.
 *
 * Every bar this returns is now a week we were actually watching, so a zero
 * in the chart is a real week with no slips.
 */
async function launchSlipsByWeek(now: Date): Promise<ChartSeries | null> {
  const maxWeeks = 8;
  const window = new Date(now.getTime() - maxWeeks * 7 * 86400000);
  const rows = await prisma.launchDateChange.findMany({
    where: { observedAt: { gte: window } },
    select: { observedAt: true },
  });
  if (rows.length < 5) return null;

  // The first observation anywhere in the ledger — not just inside the
  // window — tells us when recording actually began.
  const first = await prisma.launchDateChange.findFirst({
    orderBy: { observedAt: 'asc' },
    select: { observedAt: true },
  });
  const ledgerStart = first ? first.observedAt.getTime() : window.getTime();

  const buckets: { label: string; start: number; count: number }[] = [];
  for (let i = maxWeeks - 1; i >= 0; i--) {
    const start = new Date(now.getTime() - (i + 1) * 7 * 86400000);
    // Drop any week that ENDED before we were recording. A week we only
    // partly covered still counts: its zero could be real.
    const end = start.getTime() + 7 * 86400000;
    if (end <= ledgerStart) continue;
    buckets.push({ label: `${MONTH[start.getUTCMonth()]} ${start.getUTCDate()}`, start: start.getTime(), count: 0 });
  }
  if (buckets.length === 0) return null;

  for (const r of rows) {
    const t = r.observedAt.getTime();
    for (let i = buckets.length - 1; i >= 0; i--) {
      if (t >= buckets[i].start) { buckets[i].count++; break; }
    }
  }
  return {
    labels: buckets.map((b) => b.label),
    values: buckets.map((b) => b.count),
    note: 'week beginning',
    recordCount: buckets.reduce((sum, b) => sum + b.count, 0),
  };
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

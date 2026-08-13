import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

// Sentinel companyName values for site-wide aggregate rows. Kept out of the
// "real company" result sets (movers, per-company series lookups) by name.
export const TOTAL_SENTINEL = '_TOTAL';
export const PRIVATE_TOTAL_SENTINEL = '_PRIVATE_TOTAL';
const SENTINELS = [TOTAL_SENTINEL, PRIVATE_TOTAL_SENTINEL];

export interface HiringSeriesPoint {
  date: string; // YYYY-MM-DD
  activeJobs: number;
}

export interface HiringSeriesResult {
  companyName: string;
  series: HiringSeriesPoint[];
  latest: number | null;
  latestDate: string | null;
  changeVs30d: number | null; // absolute change vs ~30 days ago; null if no comparison point exists
  hasEnoughHistory: boolean; // true once >= 7 days of snapshots exist
}

export interface HiringMoverEntry {
  companyName: string;
  companyProfileId: string | null;
  current: number;
  previous: number | null;
  absoluteChange: number | null;
  percentChange: number | null; // null when previous is 0 or unknown (guards div-by-zero)
}

export interface HiringMoversResult {
  asOf: string | null; // date of the "current" snapshot used, null if no data at all
  compareDate: string | null;
  gainers: { byAbsolute: HiringMoverEntry[]; byPercent: HiringMoverEntry[] };
  decliners: { byAbsolute: HiringMoverEntry[]; byPercent: HiringMoverEntry[] };
}

export interface CaptureHiringSnapshotResult {
  date: string;
  companiesSnapshotted: number;
  totalActive: number;
  privateActive: number;
}

/** Today's date at UTC midnight, truncated to a calendar date (matches @db.Date). */
function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function daysAgoUTC(days: number): Date {
  const d = todayUTC();
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Captures one daily snapshot of active job counts per company, plus the two
 * site-wide sentinel rows (_TOTAL, _PRIVATE_TOTAL). Idempotent for a given
 * UTC calendar date via upsert on the (date, companyName) unique constraint —
 * safe to re-run (e.g. after a retry) without creating duplicate rows.
 *
 * "Private" mirrors /api/widgets/jobs semantics: a posting counts as private
 * unless it is linked to a CompanyProfile with isPublic === true.
 */
export async function captureHiringSnapshot(): Promise<CaptureHiringSnapshotResult> {
  const date = todayUTC();

  const jobs = await prisma.spaceJobPosting.findMany({
    where: { isActive: true },
    select: {
      company: true,
      companyProfileId: true,
      source: true,
      companyProfile: { select: { isPublic: true } },
    },
  });

  interface Agg {
    count: number;
    companyProfileId: string | null;
    allAts: boolean; // true only if every counted posting came through ATS sync
  }
  const byCompany = new Map<string, Agg>();
  let totalActive = 0;
  let privateActive = 0;

  for (const job of jobs) {
    totalActive++;
    const isPublicCompany = job.companyProfile?.isPublic === true;
    if (!isPublicCompany) privateActive++;

    const key = job.company?.trim();
    if (!key) continue;

    const isAts = job.source != null;
    const existing = byCompany.get(key);
    if (existing) {
      existing.count++;
      if (!existing.companyProfileId && job.companyProfileId) {
        existing.companyProfileId = job.companyProfileId;
      }
      existing.allAts = existing.allAts && isAts;
    } else {
      byCompany.set(key, {
        count: 1,
        companyProfileId: job.companyProfileId ?? null,
        allAts: isAts,
      });
    }
  }

  const upsertRow = (companyName: string, activeJobs: number, companyProfileId: string | null, source: string | null) =>
    prisma.companyJobSnapshot.upsert({
      where: { date_companyName: { date, companyName } },
      create: { date, companyName, activeJobs, companyProfileId, source },
      update: { activeJobs, companyProfileId, source },
    });

  const ops = [
    upsertRow(TOTAL_SENTINEL, totalActive, null, null),
    upsertRow(PRIVATE_TOTAL_SENTINEL, privateActive, null, null),
    ...Array.from(byCompany.entries()).map(([companyName, agg]) =>
      upsertRow(companyName, agg.count, agg.companyProfileId, agg.allAts ? 'ats' : null)
    ),
  ];

  // Chunk to avoid overwhelming the pool on very large company counts.
  const CHUNK = 25;
  for (let i = 0; i < ops.length; i += CHUNK) {
    await Promise.all(ops.slice(i, i + CHUNK));
  }

  logger.info('hiring-snapshot captured', {
    date: toDateKey(date),
    companies: byCompany.size,
    totalActive,
    privateActive,
  });

  return {
    date: toDateKey(date),
    companiesSnapshotted: byCompany.size,
    totalActive,
    privateActive,
  };
}

/**
 * Time series of active-job counts for a single company, looked up by
 * CompanyProfile slug (preferred) or raw denormalized company name.
 * Also accepts the '_TOTAL' / '_PRIVATE_TOTAL' sentinels for site-wide series.
 *
 * Never fabricates history: if the dataset only has today's row, `series`
 * has one point, `changeVs30d` is null, and `hasEnoughHistory` is false.
 */
export async function getHiringSeries(companySlugOrName: string, days = 90): Promise<HiringSeriesResult> {
  const cutoff = daysAgoUTC(days);

  let companyName = companySlugOrName;
  let where: { date: { gte: Date }; companyName?: string; OR?: Array<Record<string, unknown>> } = {
    date: { gte: cutoff },
    companyName: companySlugOrName,
  };

  if (!SENTINELS.includes(companySlugOrName)) {
    const profile = await prisma.companyProfile.findUnique({
      where: { slug: companySlugOrName },
      select: { id: true, name: true },
    });
    if (profile) {
      companyName = profile.name;
      where = {
        date: { gte: cutoff },
        OR: [{ companyProfileId: profile.id }, { companyName: profile.name }],
      };
    }
  }

  const rows = await prisma.companyJobSnapshot.findMany({
    where,
    orderBy: { date: 'asc' },
    select: { date: true, activeJobs: true },
  });

  // Guard against duplicate rows on the same date (can happen if a company's
  // postings straddle a linked-profile name and a raw denormalized name) by
  // keeping the higher count per date.
  const byDate = new Map<string, number>();
  for (const r of rows) {
    const key = toDateKey(r.date);
    const prev = byDate.get(key);
    if (prev === undefined || r.activeJobs > prev) byDate.set(key, r.activeJobs);
  }

  const series: HiringSeriesPoint[] = Array.from(byDate.entries())
    .map(([date, activeJobs]) => ({ date, activeJobs }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const latestPoint = series.length > 0 ? series[series.length - 1] : null;

  // Nearest point to ~30 days before the latest snapshot, if one exists.
  let changeVs30d: number | null = null;
  if (latestPoint) {
    const targetDate = new Date(latestPoint.date + 'T00:00:00Z');
    targetDate.setUTCDate(targetDate.getUTCDate() - 30);
    const targetKey = toDateKey(targetDate);
    // Closest available point on/before the target date.
    let comparePoint: HiringSeriesPoint | null = null;
    for (const p of series) {
      if (p.date <= targetKey) comparePoint = p;
      else break;
    }
    if (comparePoint) {
      changeVs30d = latestPoint.activeJobs - comparePoint.activeJobs;
    }
  }

  return {
    companyName,
    series,
    latest: latestPoint?.activeJobs ?? null,
    latestDate: latestPoint?.date ?? null,
    changeVs30d,
    hasEnoughHistory: series.length >= 7,
  };
}

/**
 * Top hiring-velocity movers over the trailing `days` window, among
 * companies with >= 5 active jobs as of the most recent snapshot date.
 *
 * Honest about sparse data: a company with no snapshot from ~`days` ago is
 * excluded from ranked lists (its change can't be computed) rather than
 * silently defaulting to 0. Percent change guards against division by zero
 * by returning null when the prior count was 0.
 */
export async function getHiringMovers(days = 30): Promise<HiringMoversResult> {
  const latest = await prisma.companyJobSnapshot.findFirst({
    where: { companyName: { notIn: SENTINELS } },
    orderBy: { date: 'desc' },
    select: { date: true },
  });

  if (!latest) {
    return {
      asOf: null,
      compareDate: null,
      gainers: { byAbsolute: [], byPercent: [] },
      decliners: { byAbsolute: [], byPercent: [] },
    };
  }

  const currentRows = await prisma.companyJobSnapshot.findMany({
    where: {
      date: latest.date,
      companyName: { notIn: SENTINELS },
      activeJobs: { gte: 5 },
    },
    select: { companyName: true, companyProfileId: true, activeJobs: true },
  });

  const cutoff = new Date(latest.date);
  cutoff.setUTCDate(cutoff.getUTCDate() - days);

  const compareRows = currentRows.length
    ? await prisma.companyJobSnapshot.findMany({
        where: {
          companyName: { in: currentRows.map((r) => r.companyName) },
          date: { lte: cutoff },
        },
        orderBy: { date: 'desc' },
        select: { companyName: true, activeJobs: true, date: true },
      })
    : [];

  // First hit per company (desc order, all <= cutoff) is the closest match to the cutoff date.
  const compareMap = new Map<string, { activeJobs: number; date: Date }>();
  for (const r of compareRows) {
    if (!compareMap.has(r.companyName)) compareMap.set(r.companyName, r);
  }

  let compareDate: string | null = null;

  const entries: HiringMoverEntry[] = currentRows.map((cur) => {
    const prev = compareMap.get(cur.companyName);
    if (!prev) {
      return {
        companyName: cur.companyName,
        companyProfileId: cur.companyProfileId,
        current: cur.activeJobs,
        previous: null,
        absoluteChange: null,
        percentChange: null,
      };
    }
    if (!compareDate || toDateKey(prev.date) > compareDate) compareDate = toDateKey(prev.date);
    const absoluteChange = cur.activeJobs - prev.activeJobs;
    const percentChange = prev.activeJobs > 0 ? (absoluteChange / prev.activeJobs) * 100 : null;
    return {
      companyName: cur.companyName,
      companyProfileId: cur.companyProfileId,
      current: cur.activeJobs,
      previous: prev.activeJobs,
      absoluteChange,
      percentChange,
    };
  });

  const withAbsChange = entries.filter((e) => e.absoluteChange !== null) as (HiringMoverEntry & { absoluteChange: number })[];
  const withPctChange = entries.filter((e) => e.percentChange !== null) as (HiringMoverEntry & { percentChange: number })[];

  const gainersByAbsolute = [...withAbsChange]
    .filter((e) => e.absoluteChange > 0)
    .sort((a, b) => b.absoluteChange - a.absoluteChange)
    .slice(0, 10);
  const declinersByAbsolute = [...withAbsChange]
    .filter((e) => e.absoluteChange < 0)
    .sort((a, b) => a.absoluteChange - b.absoluteChange)
    .slice(0, 10);
  const gainersByPercent = [...withPctChange]
    .filter((e) => e.percentChange > 0)
    .sort((a, b) => b.percentChange - a.percentChange)
    .slice(0, 10);
  const declinersByPercent = [...withPctChange]
    .filter((e) => e.percentChange < 0)
    .sort((a, b) => a.percentChange - b.percentChange)
    .slice(0, 10);

  return {
    asOf: toDateKey(latest.date),
    compareDate,
    gainers: { byAbsolute: gainersByAbsolute, byPercent: gainersByPercent },
    decliners: { byAbsolute: declinersByAbsolute, byPercent: declinersByPercent },
  };
}
